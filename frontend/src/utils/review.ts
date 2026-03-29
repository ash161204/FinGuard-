import type {
  CamsHolding,
  CamsReviewData,
  Form16ReviewData,
  ReviewedDocumentData,
} from '../types';

export function emptyForm16Review(): Form16ReviewData {
  return {
    level_1: {
      salary: null,
      hra_received: null,
      rent_paid: null,
      tax_deducted: null,
      deductions: {
        '80C': null,
        '80D': null,
        '80CCD1B': null,
      },
    },
    level_2: {
      lta: null,
      bonus: null,
      other_allowances: null,
      professional_tax: null,
    },
    level_3: {
      previous_employer_income: null,
      other_income: null,
      losses: null,
    },
  };
}

export function emptyHolding(): CamsHolding {
  return {
    fund_name: '',
    category: '',
    invested: null,
    current: null,
    purchase_date: '',
    plan: null,
  };
}

export function emptyCamsReview(): CamsReviewData {
  return { holdings: [emptyHolding()] };
}

export function asForm16Review(data: ReviewedDocumentData | null | undefined): Form16ReviewData {
  const source = (data as Partial<Form16ReviewData> | null) ?? {};
  return {
    level_1: {
      salary: source.level_1?.salary ?? null,
      hra_received: source.level_1?.hra_received ?? null,
      rent_paid: source.level_1?.rent_paid ?? null,
      tax_deducted: source.level_1?.tax_deducted ?? null,
      deductions: {
        '80C': source.level_1?.deductions?.['80C'] ?? null,
        '80D': source.level_1?.deductions?.['80D'] ?? null,
        '80CCD1B': source.level_1?.deductions?.['80CCD1B'] ?? null,
      },
    },
    level_2: {
      lta: source.level_2?.lta ?? null,
      bonus: source.level_2?.bonus ?? null,
      other_allowances: source.level_2?.other_allowances ?? null,
      professional_tax: source.level_2?.professional_tax ?? null,
    },
    level_3: {
      previous_employer_income: source.level_3?.previous_employer_income ?? null,
      other_income: source.level_3?.other_income ?? null,
      losses: source.level_3?.losses ?? null,
    },
  };
}

export function asCamsReview(data: ReviewedDocumentData | null | undefined): CamsReviewData {
  const source = data as Partial<CamsReviewData> | null;
  const holdings = source?.holdings?.length
    ? source.holdings.map((holding) => ({
        fund_name: holding.fund_name ?? '',
        category: holding.category ?? '',
        invested: holding.invested ?? null,
        current: holding.current ?? null,
        purchase_date: holding.purchase_date ?? '',
        plan: holding.plan ?? null,
      }))
    : [emptyHolding()];

  return { holdings };
}

export function parseNumberInput(value: string): number | null {
  const cleaned = value.replace(/[^\d.-]/g, '').trim();
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function numberInputValue(value: number | null): string {
  return value == null ? '' : String(value);
}
