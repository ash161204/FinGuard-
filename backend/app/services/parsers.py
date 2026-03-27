import re
from typing import Callable, Dict, List

from app.schemas import BankStatementData, CACampsData, DocumentType, Form16Data, Transaction

PAN_PATTERN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
DATE_PATTERN = re.compile(
    r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b"
)
AMOUNT_PATTERN = re.compile(r"(?:INR|Rs\.?|₹)?\s?([0-9][0-9,]*(?:\.\d{1,2})?)")


def _clean_value(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip(" :-\t"))


def _lines(text: str) -> List[str]:
    return [_clean_value(line) for line in text.splitlines() if _clean_value(line)]


def _find_pan(text: str) -> str:
    match = PAN_PATTERN.search((text or "").upper())
    return match.group(0) if match else ""


def _extract_label_value(text: str, labels: List[str]) -> str:
    lines = _lines(text)

    for index, line in enumerate(lines):
        normalized_line = line.lower()

        for label in labels:
            normalized_label = label.lower()
            if normalized_label not in normalized_line:
                continue

            if ":" in line:
                tail = line.split(":", 1)[1]
                cleaned_tail = _clean_value(tail)
                if cleaned_tail:
                    return cleaned_tail

            tail_without_label = re.sub(re.escape(label), "", line, flags=re.IGNORECASE)
            cleaned_tail = _clean_value(tail_without_label)
            if cleaned_tail and cleaned_tail.lower() != normalized_label:
                return cleaned_tail

            for next_line in lines[index + 1 : index + 4]:
                if next_line and normalized_label not in next_line.lower():
                    return next_line

    return ""


def _extract_pattern(patterns: List[str], text: str) -> str:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE)
        if match:
            return _clean_value(match.group(1))
    return ""


def _extract_amount_for_labels(text: str, labels: List[str]) -> str:
    label_value = _extract_label_value(text, labels)
    if label_value:
        amount_match = AMOUNT_PATTERN.search(label_value)
        return amount_match.group(1) if amount_match else label_value

    for line in _lines(text):
        if any(label.lower() in line.lower() for label in labels):
            amount_match = AMOUNT_PATTERN.search(line)
            if amount_match:
                return amount_match.group(1)

    return ""


def parse_form16(text: str) -> dict:
    """Parse a Form 16 PDF into structured JSON."""

    parsed = Form16Data(
        employee_name=_extract_label_value(
            text,
            ["Employee Name", "Name of employee", "Name and address of the employee"],
        ),
        pan=_find_pan(text),
        employer_name=_extract_label_value(
            text,
            ["Employer Name", "Name and address of the employer", "Deductor Name"],
        ),
        assessment_year=_extract_pattern(
            [r"Assessment\s+Year\s*[:\-]?\s*([0-9]{4}\s*[-/]\s*[0-9]{2,4})"],
            text,
        ),
        total_income=_extract_amount_for_labels(
            text,
            ["Total Income", "Gross Total Income", "Income chargeable under the head Salaries"],
        ),
        tax_deducted=_extract_amount_for_labels(
            text,
            ["Tax Deducted", "Total tax deducted", "Tax Deposited / Remitted"],
        ),
    )

    return parsed.model_dump()


def parse_ca_camps(text: str) -> dict:
    """Parse semi-structured CA/tax documents into structured JSON."""

    service_keywords = [
        "audit",
        "gst",
        "tds",
        "itr",
        "return filing",
        "bookkeeping",
        "compliance",
        "advisory",
        "tax planning",
        "accounting",
    ]

    services: List[str] = []
    for line in _lines(text):
        lowered = line.lower()
        if any(keyword in lowered for keyword in service_keywords):
            services.append(line)

    deduped_services = list(dict.fromkeys(services))

    parsed = CACampsData(
        client_name=_extract_label_value(text, ["Client Name", "Name of Client", "Client", "Name"]),
        pan=_find_pan(text),
        services=deduped_services,
        fees=_extract_amount_for_labels(text, ["Fees", "Professional Fees", "Amount", "Total Fees"]),
        date=_extract_pattern(
            [
                r"Date\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
                r"Date\s*[:\-]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})",
            ],
            text,
        ),
    )

    return parsed.model_dump()


def _parse_transaction_lines(text: str) -> List[Transaction]:
    transaction_patterns = [
        re.compile(
            r"^(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(?P<description>.+?)\s+(?P<debit>-|[0-9][0-9,]*\.?[0-9]{0,2})\s+(?P<credit>-|[0-9][0-9,]*\.?[0-9]{0,2})\s+(?P<balance>[0-9][0-9,]*\.?[0-9]{0,2})$"
        ),
        re.compile(
            r"^(?P<date>\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\s+(?P<description>.+?)\s+(?P<debit>-|[0-9][0-9,]*\.?[0-9]{0,2})\s+(?P<credit>-|[0-9][0-9,]*\.?[0-9]{0,2})\s+(?P<balance>[0-9][0-9,]*\.?[0-9]{0,2})$"
        ),
    ]

    transactions: List[Transaction] = []
    for line in _lines(text):
        normalized_line = re.sub(r"\s{2,}", " ", line)
        for pattern in transaction_patterns:
            match = pattern.match(normalized_line)
            if not match:
                continue

            transactions.append(
                Transaction(
                    date=_clean_value(match.group("date")),
                    description=_clean_value(match.group("description")),
                    debit="" if match.group("debit") == "-" else match.group("debit"),
                    credit="" if match.group("credit") == "-" else match.group("credit"),
                    balance=_clean_value(match.group("balance")),
                )
            )
            break

    return transactions


def parse_bank_statement(text: str) -> dict:
    """Parse a bank statement PDF into structured JSON."""

    lines = _lines(text)
    bank_name = _extract_label_value(text, ["Bank Name", "Branch Name"])
    if not bank_name:
        bank_line = next((line for line in lines[:10] if "BANK" in line.upper()), "")
        bank_name = bank_line

    account_number = _extract_pattern(
        [r"Account\s*(?:Number|No\.?|#)\s*[:\-]?\s*([0-9Xx*]{6,})"],
        text,
    )
    account_holder = _extract_label_value(
        text,
        ["Account Holder", "Customer Name", "Account Name", "Name"],
    )

    parsed = BankStatementData(
        account_holder=account_holder,
        account_number=account_number,
        bank_name=bank_name,
        transactions=_parse_transaction_lines(text),
    )

    return parsed.model_dump()


PARSER_MAP: Dict[DocumentType, Callable[[str], dict]] = {
    DocumentType.form16: parse_form16,
    DocumentType.ca_camps: parse_ca_camps,
    DocumentType.bank_statement: parse_bank_statement,
}