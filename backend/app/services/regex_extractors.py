import re
from typing import Any


def _extract_amount(text: str, labels: list[str]) -> float | None:
    for label in labels:
        pattern = re.compile(
            rf"{label}[^0-9]{{0,50}}([0-9][0-9,]*(?:\.\d+)?)",
            flags=re.IGNORECASE,
        )
        match = pattern.search(text)
        if match:
            return float(match.group(1).replace(",", ""))
    return None


def extract_form16_candidates(text: str) -> dict[str, Any]:
    return {
        "salary": _extract_amount(text, ["gross salary", "salary income", "salary"]),
        "hra_received": _extract_amount(text, ["hra received", "house rent allowance", r"\bhra\b"]),
        "rent_paid": _extract_amount(text, ["rent paid", "annual rent"]),
        "tax_deducted": _extract_amount(text, ["tax deducted", r"\btds\b"]),
        "deductions": {
            "80C": _extract_amount(text, [r"80c", "section 80c"]),
            "80D": _extract_amount(text, [r"80d", "section 80d"]),
            "80CCD1B": _extract_amount(text, [r"80ccd\(1b\)", r"80ccd1b", "section 80ccd(1b)"]),
        },
        "lta": _extract_amount(text, [r"\blta\b", "leave travel allowance"]),
        "bonus": _extract_amount(text, [r"\bbonus\b"]),
        "other_allowances": _extract_amount(text, ["other allowances", "other allowance"]),
        "professional_tax": _extract_amount(text, ["professional tax"]),
        "previous_employer_income": _extract_amount(text, ["previous employer income"]),
        "other_income": _extract_amount(text, ["other income"]),
        "losses": _extract_amount(text, ["losses brought forward", r"\blosses\b"]),
    }


def extract_cams_candidates(text: str) -> dict[str, Any]:
    # Text normalization: replace multiple spaces with single space, preserve newlines
    clean_text = re.sub(r'[ \t]+', ' ', text)
    
    # regex patterns as requested by user
    house_pattern = re.compile(r'([A-Z][A-Za-z\s]+ Mutual Fund)')
    parts = house_pattern.split(clean_text)
    
    houses = []
    # If the file didn't perfectly match the exact split, fallback to whole text chunking
    if len(parts) > 1:
        for i in range(1, len(parts), 2):
            # Combine the delimiter and the text following it
            houses.append(parts[i] + parts[i+1])
    else:
        houses = [clean_text]
        
    scheme_pattern = re.compile(r'([A-Z0-9]{3,}-[A-Za-z\s]+?Fund\.?(?:.*?(?:Direct|Regular))?)', re.IGNORECASE)

    transaction_pattern = re.compile(
        r'(\d{2}-[A-Za-z]{3}-\d{4})\s+Purchase\s+([\d,]+\.\d{2})\s+([\d.]+)\s+([\d.]+)'
    )
    closing_balance_pattern = re.compile(r'Closing Unit Balance:\s+([\d.]+)', re.IGNORECASE)
    valuation_pattern = re.compile(r'NAV\.?:\s*INR\s+([\d.]+)\s*Valuation\.?:\s*INR\s+([\d,]+\.\d{2})', re.IGNORECASE)
    
    def normalize_key(raw_name: str) -> tuple[str, str, str, str]:
        clean = re.sub(r'^[A-Z0-9]{3,}-', '', raw_name).strip()
        plan = "Direct" if "Direct" in clean else "Regular" if "Regular" in clean else "Unknown"
        option = "Growth" if "Growth" in clean else "Dividend" if "Dividend" in clean else "Unknown"
        base_name = clean.split('-')[0].strip()
        key = f"{base_name}|{plan}|{option}"
        return key, base_name, plan, option

    funds: dict[str, Any] = {}

    for house in houses:
        scheme_parts = scheme_pattern.split(house)
        if len(scheme_parts) > 1:
            for i in range(1, len(scheme_parts), 2):
                raw_scheme_name = scheme_parts[i].strip()
                block_content = scheme_parts[i+1]
                
                key, base_name, plan, option = normalize_key(raw_scheme_name)
                
                transactions = []
                for match in transaction_pattern.finditer(block_content):
                    transactions.append({
                        "date": match.group(1),
                        "amount": float(match.group(2).replace(',', '')),
                        "units": float(match.group(3).replace(',', '')),
                        "nav": float(match.group(4).replace(',', ''))
                    })
                
                units = None
                ub_match = closing_balance_pattern.search(block_content)
                if ub_match:
                    units = float(ub_match.group(1).replace(',', ''))
                    
                valuation = None
                val_match = valuation_pattern.search(block_content)
                if val_match:
                    valuation = float(val_match.group(2).replace(',', ''))
                
                if key not in funds:
                    funds[key] = {
                        "raw_name": raw_scheme_name,
                        "fund_name": base_name,
                        "plan": plan if plan != "Unknown" else None,
                        "option": option if option != "Unknown" else None,
                        "category": None,
                        "invested": 0.0,
                        "current": None,
                        "units": None,
                        "transactions": []
                    }
                
                funds[key]["transactions"].extend(transactions)
                funds[key]["invested"] += sum(t["amount"] for t in transactions)
                if units is not None:
                    # Take the latest occurrences directly overriding (assuming sequential blocks)
                    funds[key]["units"] = units
                if valuation is not None:
                    funds[key]["current"] = valuation

    # Final conversion to target JSON shape
    holdings_list = []
    for k, v in funds.items():
        v.pop("raw_name", None)
        holdings_list.append(v)
    
    return {"holdings": holdings_list}
