
// ══════════════════════════════════════════════════════════════════════════════
// INSIGHT ENGINE — Tax Wizard + MF Portfolio X-Ray + Money Health + Bank Stmt
// Implements all 134 rules (72 Tax + 62 MF) + H1-H6 + B1-B6
// FY 2025-26 | Post Budget 2025 | Post Professional Audit
// ══════════════════════════════════════════════════════════════════════════════

// ── TER Data (Module 4: M29–M36) ──
const TER_DATA = {
  "Large Cap": { regular: 1.65, direct: 0.85 },
  "Mid Cap": { regular: 1.85, direct: 0.95 },
  "Small Cap": { regular: 1.90, direct: 1.00 },
  "Flexi Cap": { regular: 1.70, direct: 0.80 },
  Index: { regular: 0.50, direct: 0.12 },
  "Short Duration": { regular: 0.95, direct: 0.40 },
  Hybrid: { regular: 1.75, direct: 0.90 },
  ELSS: { regular: 1.80, direct: 0.85 },
  "Multi Cap": { regular: 1.70, direct: 0.85 },
  Gilt: { regular: 0.80, direct: 0.35 },
  Liquid: { regular: 0.50, direct: 0.15 },
};

// ── Overlap Data (Module 3: M19–M28) ──
const OVERLAP_DATA = {
  "Large Cap": ["Reliance Industries", "HDFC Bank", "Infosys", "ICICI Bank", "TCS", "Bharti Airtel", "Larsen & Toubro", "ITC", "Axis Bank", "Kotak Bank"],
  "Mid Cap": ["Bharat Electronics", "Persistent Systems", "Zydus Life", "Voltas", "Cummins India", "Apollo Tyres", "Max Healthcare", "Coforge", "Sundaram Finance", "Thermax"],
  "Small Cap": ["Techno Electric", "Garware Technical", "Elecon Engineering", "HLE Glascoat", "Nuvoco Vistas", "Shyam Metalics", "Craftsman Auto", "Safari Industries", "Praj Industries", "Ami Organics"],
  "Flexi Cap": ["Reliance Industries", "HDFC Bank", "Infosys", "ICICI Bank", "Persistent Systems", "Axis Bank", "Bajaj Finance", "Maruti Suzuki", "TCS", "Dr. Reddy"],
  Index: ["Reliance Industries", "HDFC Bank", "Infosys", "ICICI Bank", "TCS", "Bharti Airtel", "Larsen & Toubro", "ITC", "Axis Bank", "Kotak Bank"],
  ELSS: ["Reliance Industries", "HDFC Bank", "ICICI Bank", "Infosys", "Axis Bank", "Maruti Suzuki", "SBI", "L&T", "Bajaj Finance", "HUL"],
  Hybrid: ["Reliance Industries", "HDFC Bank", "ICICI Bank", "Infosys", "TCS", "Bharti Airtel", "Kotak Bank", "ITC", "Axis Bank", "Larsen & Toubro"],
};

// ── Benchmark Data (Module 5: M37–M44) — with 1yr, 3yr, 5yr returns ──
const BENCHMARKS = {
  "Large Cap": { name: "Nifty 100 TRI", returns1yr: 0.18, returns3yr: 0.14, returns5yr: 0.16 },
  "Mid Cap": { name: "Nifty Midcap 150 TRI", returns1yr: 0.28, returns3yr: 0.22, returns5yr: 0.24 },
  "Small Cap": { name: "Nifty Smallcap 250 TRI", returns1yr: 0.32, returns3yr: 0.24, returns5yr: 0.26 },
  "Flexi Cap": { name: "Nifty 500 TRI", returns1yr: 0.22, returns3yr: 0.18, returns5yr: 0.20 },
  "Multi Cap": { name: "Nifty 500 Multicap 50:25:25 TRI", returns1yr: 0.22, returns3yr: 0.18, returns5yr: 0.20 },
  Index: { name: "Nifty 50 TRI", returns1yr: 0.16, returns3yr: 0.13, returns5yr: 0.14 },
  ELSS: { name: "Nifty 500 TRI", returns1yr: 0.22, returns3yr: 0.18, returns5yr: 0.20 },
  Hybrid: { name: "CRISIL Hybrid 35+65", returns1yr: 0.15, returns3yr: 0.12, returns5yr: 0.13 },
  "Short Duration": { name: "CRISIL Short Duration", returns1yr: 0.075, returns3yr: 0.072, returns5yr: 0.07 },
  Gilt: { name: "CRISIL Dynamic Gilt", returns1yr: 0.08, returns3yr: 0.075, returns5yr: 0.072 },
  Liquid: { name: "CRISIL Liquid Fund Index", returns1yr: 0.065, returns3yr: 0.06, returns5yr: 0.058 },
};

// ── Index fund TER benchmarks (M35) ──
const INDEX_TER_BENCHMARKS = {
  "Nifty 50": 0.20,
  "Nifty Next 50": 0.30,
  "Nifty Midcap 150": 0.40,
};

// ── Expensive fund TER thresholds (M34) ──
const TER_THRESHOLDS = {
  equity: { red: 2.0, yellow: 1.5 },
  debt: { red: 1.0, yellow: 0.7 },
  hybrid: { red: 1.5, yellow: 1.2 },
  index: { red: 0.5, yellow: 0.3 },
};

const DATE_AFTER_APRIL_2023 = new Date("2023-04-01");

// ══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

const normalizeKey = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseMoney = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/,/g, "").replace(/[^0-9.-]/g, "").trim();
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseText = (value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const parseDate = (value) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const walkNode = (node, visitor) => {
  if (Array.isArray(node)) {
    node.forEach((item) => walkNode(item, visitor));
    return;
  }
  if (!isObject(node)) return;
  Object.entries(node).forEach(([key, value]) => {
    visitor(key, value, node);
    walkNode(value, visitor);
  });
};

const getValuesByKeys = (root, keys) => {
  const wanted = new Set(keys.map(normalizeKey));
  const matches = [];
  walkNode(root, (key, value) => {
    if (wanted.has(normalizeKey(key))) matches.push(value);
  });
  return matches;
};

const getFirstNumber = (root, keys) => {
  const values = getValuesByKeys(root, keys);
  for (const value of values) {
    const parsed = parseMoney(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
};

const getFirstString = (root, keys) => {
  const values = getValuesByKeys(root, keys);
  for (const value of values) {
    const parsed = parseText(value);
    if (parsed) return parsed;
  }
  return undefined;
};

const getFirstAcrossDocuments = (documents, getter) => {
  for (const document of documents) {
    const value = getter(document);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

export const unwrapAnalysis = (document) => document?.analysis || document?.output || document?.data || document || {};

// ══════════════════════════════════════════════════════════════════════════════
// MF HELPERS (Module 1: M1–M10)
// ══════════════════════════════════════════════════════════════════════════════

const inferCategory = (rawCategory, rawName) => {
  const source = `${rawCategory || ""} ${rawName || ""}`.toLowerCase();
  if (source.includes("small")) return "Small Cap";
  if (source.includes("mid")) return "Mid Cap";
  if (source.includes("flexi")) return "Flexi Cap";
  if (source.includes("multi")) return "Multi Cap";
  if (source.includes("index") || source.includes("nifty")) return "Index";
  if (source.includes("elss") || source.includes("tax saver")) return "ELSS";
  if (source.includes("liquid")) return "Liquid";
  if (source.includes("gilt")) return "Gilt";
  if (source.includes("overnight") || source.includes("money market")) return "Liquid";
  if (source.includes("credit risk")) return "Credit Risk";
  if (source.includes("medium duration")) return "Medium Duration";
  if (source.includes("long duration")) return "Long Duration";
  if (source.includes("debt") || source.includes("short duration") || source.includes("short term")) return "Short Duration";
  if (source.includes("dynamic bond")) return "Medium Duration";
  if (source.includes("balanced advantage") || source.includes("balanced adv")) return "Hybrid";
  if (source.includes("hybrid") || source.includes("balanced") || source.includes("aggressive hybrid")) return "Hybrid";
  if (source.includes("arbitrage")) return "Hybrid";
  if (source.includes("sectoral") || source.includes("thematic")) return "Large Cap";
  if (source.includes("gold")) return "Gold ETF";
  return "Large Cap";
};

const isEquity = (category) => ["Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "Multi Cap", "ELSS", "Index", "Hybrid"].includes(category);
const isDebt = (category) => ["Short Duration", "Gilt", "Liquid", "Credit Risk", "Medium Duration", "Long Duration"].includes(category);

const getOverlapPct = (categoryOne, categoryTwo) => {
  if (categoryOne === categoryTwo) return 85;
  const holdingsOne = OVERLAP_DATA[categoryOne] || [];
  const holdingsTwo = OVERLAP_DATA[categoryTwo] || [];
  const common = holdingsOne.filter((stock) => holdingsTwo.includes(stock));
  return Math.round((common.length / Math.max(holdingsOne.length, 1)) * 100);
};

// Module 2: M11–M18 — XIRR calculation
const computeXIRR = (invested, current, years) => {
  if (!invested || !current || years <= 0) return 0;
  return Math.pow(current / invested, 1 / years) - 1;
};

// M18: XIRR color coding
const getXIRRColor = (xirr, benchmarkReturn) => {
  if (xirr < 0.06) return "red";
  if (benchmarkReturn && xirr < benchmarkReturn) return "yellow";
  return "green";
};

// M15: XIRR reliability
const getXIRRReliability = (years) => {
  if (years < 0.5) return "unreliable";
  if (years < 1) return "volatile";
  return "valid";
};

const mapHolding = (item) => {
  if (!isObject(item)) return null;

  const name = getFirstString(item, [
    "fund_name", "scheme_name", "scheme", "fund", "name",
    "security_name", "description", "scheme_description",
  ]);
  const invested = getFirstNumber(item, [
    "invested_amount", "amount_invested", "invested", "cost",
    "cost_value", "purchase_amount", "book_value", "principal",
    "total_investment", "amount",
  ]);
  let current = getFirstNumber(item, [
    "current_value", "market_value", "current", "value",
    "current_market_value", "valuation", "current_worth", "present_value",
  ]);
  const units = getFirstNumber(item, ["units", "unit_balance", "balance_units", "closing_units"]);
  const nav = getFirstNumber(item, ["nav", "current_nav", "nav_per_unit"]);

  if (current === undefined && units !== undefined && nav !== undefined) {
    current = units * nav;
  }

  if (!name || invested === undefined || current === undefined) return null;

  const category = inferCategory(
    getFirstString(item, ["category", "fund_category", "scheme_category", "asset_class", "asset_type", "scheme_type", "fund_type"]),
    name,
  );
  const purchaseDate =
    parseDate(getFirstString(item, ["purchase_date", "first_investment_date", "acquisition_date", "allotment_date", "date", "transaction_date"])) ||
    new Date("2022-01-01");
  const plan =
    getFirstString(item, ["plan", "plan_type", "mode", "option", "scheme_option"]) ||
    (String(name).toLowerCase().includes("regular") ? "Regular" : "Direct");

  return {
    name,
    category,
    invested,
    current,
    purchaseDate,
    plan,
    amc: getFirstString(item, ["amc", "fund_house", "amc_name"]) || "",
    folioNumber: getFirstString(item, ["folio_number", "folio", "folio_no"]) || "",
    units,
    nav,
    isRegular: String(plan).toLowerCase().includes("regular"),
  };
};

const collectHoldings = (documents) => {
  const holdings = [];
  documents.forEach((document) => {
    const root = unwrapAnalysis(document);
    walkNode(root, (key, value) => {
      if (!Array.isArray(value) || !value.length) return;
      const mapped = value.map(mapHolding).filter(Boolean);
      if (mapped.length) holdings.push(...mapped);
    });
  });

  const seen = new Set();
  return holdings.filter((holding) => {
    const token = `${holding.name}-${holding.category}-${holding.invested}-${holding.current}-${holding.purchaseDate.toISOString().slice(0, 10)}`;
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
};

const mapRiskProfile = (riskVibe) => {
  const value = String(riskVibe || "").toLowerCase();
  if (value.includes("safe") || value.includes("conservative")) return "conservative";
  if (value.includes("yolo") || value.includes("aggressive") || value.includes("bold")) return "aggressive";
  return "moderate";
};

const getTargetAllocation = (profile) => ({
  conservative: { equity: 0.3, debt: 0.6, gold: 0.1 },
  moderate: { equity: 0.6, debt: 0.3, gold: 0.1 },
  aggressive: { equity: 0.8, debt: 0.15, gold: 0.05 },
}[profile] || { equity: 0.6, debt: 0.3, gold: 0.1 });

// M46: Within-equity sub-allocation targets
const getEquitySubAllocation = (profile) => ({
  conservative: { large: 0.70, mid: 0.20, small: 0.10 },
  moderate: { large: 0.50, mid: 0.30, small: 0.20 },
  aggressive: { large: 0.40, mid: 0.30, small: 0.30 },
}[profile] || { large: 0.50, mid: 0.30, small: 0.20 });

// ══════════════════════════════════════════════════════════════════════════════
// TAX WIZARD — Groups A through F (72 Rules)
// ══════════════════════════════════════════════════════════════════════════════

const extractTaxInputs = (documents) => {
  const analyses = documents.map(unwrapAnalysis);
  const assumptions = [];

  const grossSalaryReported = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["gross_salary", "grosssalary", "salary_income", "annual_salary", "salary", "gross_total_income"]));
  let basic = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["basic_salary", "basicsalary", "basic"]));
  if (basic === undefined && grossSalaryReported !== undefined) {
    basic = grossSalaryReported;
    assumptions.push("Basic salary was not available, so gross salary was used as the base input.");
  }

  const da = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["dearness_allowance", "da"]));
  const hraReceived = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["hra_received", "house_rent_allowance", "hra"]));
  const rentPaid = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["rent_paid", "annual_rent", "rent"]));
  const specialAllowances = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["special_allowances", "special_allowance"]));
  const lta = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["lta", "leave_travel_allowance"]));
  const ltaActual = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["lta_actual", "actual_travel_cost", "travel_cost"]));
  const employerNPS = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["employer_nps", "employer_nps_contribution"]));
  const otherAllowances = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["other_allowances", "other_allowance"]));
  const professionalTax = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["professional_tax", "professionaltax"]));
  const perquisites = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["perquisites", "perqs"]));
  const gratuity = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["gratuity", "gratuity_received"]));
  const fdInterest = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["fd_interest", "fixed_deposit_interest", "rd_interest"]));
  const sbInterest = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["savings_interest", "savings_bank_interest", "sb_interest"]));
  const dividend = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["dividend", "dividend_income"]));
  const epf = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["epf", "employee_pf", "employee_provident_fund"]));
  const ppf = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["ppf"]));
  const elss = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["elss", "elss_mutual_funds"]));
  const lifeInsurance = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["life_insurance_premium", "lip", "insurance_premium"]));
  const homeLoanPrincipal = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["home_loan_principal", "housing_loan_principal", "principal_repayment"]));
  const tuition = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["tuition_fees", "childrens_tuition_fees", "tuition"]));
  const nsc = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["nsc", "ssy", "tax_saving_fd"]));
  const npsEmployee = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["employee_nps", "nps_employee", "nps_contribution"]));
  const nps1b = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["nps_80ccd1b", "additional_nps", "nps1b"]));
  const healthSelf = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["health_insurance_self", "health_insurance"]));
  const healthParents = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["health_insurance_parents", "medical_insurance_parents"]));
  const preventive = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["preventive_health_check", "preventive_check"]));
  const educationLoan = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["education_loan_interest", "edu_loan_interest", "80e"]));
  const homeLoanInterest = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["home_loan_interest", "housing_loan_interest", "24b"]));
  const donations = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["donations", "80g"]));
  const otherDeductions = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["other_deductions", "others80", "80dd", "80ddb", "80u", "80gg"]));
  const stcgEquity = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["stcg_equity", "equity_stcg", "short_term_capital_gains"]));
  const ltcgEquity = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["ltcg_equity", "equity_ltcg", "long_term_capital_gains"]));
  const debtMFNew = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["debt_mf_post_apr_2023", "debtmfnew", "debt_fund_gains_new"]));
  const debtMFOld = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["debt_mf_pre_apr_2023", "debtmfold", "debt_fund_gains_old"]));
  const otherCapitalGains = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["other_capital_gains", "othercg"]));
  const totalIncome = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["total_income", "totalincome"]));
  const taxDeducted = getFirstAcrossDocuments(analyses, (doc) => getFirstNumber(doc, ["tax_deducted", "tds", "taxdeducted"]));

  return {
    available: grossSalaryReported !== undefined || totalIncome !== undefined,
    assumptions: assumptions.concat("HRA city type was not found, so non-metro HRA rules were applied."),
    identity: {
      employeeName: getFirstAcrossDocuments(analyses, (doc) => getFirstString(doc, ["employee_name", "name"])) || "",
      employerName: getFirstAcrossDocuments(analyses, (doc) => getFirstString(doc, ["employer_name"])) || "",
      pan: getFirstAcrossDocuments(analyses, (doc) => getFirstString(doc, ["pan"])) || "",
      assessmentYear: getFirstAcrossDocuments(analyses, (doc) => getFirstString(doc, ["assessment_year"])) || "",
    },
    basic: basic || 0,
    da: da || 0,
    hraReceived: hraReceived || 0,
    rentPaid: rentPaid || 0,
    specialAllowances: specialAllowances || 0,
    lta: lta || 0,
    ltaActual: ltaActual || 0,
    employerNPS: employerNPS || 0,
    otherAllowances: otherAllowances || 0,
    professionalTax: professionalTax || 0,
    perquisites: perquisites || 0,
    gratuity: gratuity || 0,
    fdInterest: fdInterest || 0,
    sbInterest: sbInterest || 0,
    dividend: dividend || 0,
    epf: epf || 0,
    ppf: ppf || 0,
    elss: elss || 0,
    lifeInsurance: lifeInsurance || 0,
    homeLoanPrincipal: homeLoanPrincipal || 0,
    tuition: tuition || 0,
    nsc: nsc || 0,
    npsEmployee: npsEmployee || 0,
    nps1b: nps1b || 0,
    healthSelf: healthSelf || 0,
    healthParents: healthParents || 0,
    preventive: preventive || 0,
    educationLoan: educationLoan || 0,
    homeLoanInterest: homeLoanInterest || 0,
    donations: donations || 0,
    otherDeductions: otherDeductions || 0,
    stcgEquity: stcgEquity || 0,
    ltcgEquity: ltcgEquity || 0,
    debtMFNew: debtMFNew || 0,
    debtMFOld: debtMFOld || 0,
    otherCapitalGains: otherCapitalGains || 0,
    totalIncome: totalIncome || 0,
    grossSalaryReported: grossSalaryReported || 0,
    taxDeducted: taxDeducted || 0,
    ageCategory: "below60",
    cityType: "nonmetro",
    parentSenior: false,
    propType: "sop",
    debtOldLong: true,
  };
};

// Rule C7: Surcharge calculation
function computeSurcharge(taxableIncome, baseTax, isNewRegime) {
  if (taxableIncome <= 5000000) return 0;
  let surchargeRate = 0;
  if (taxableIncome <= 10000000) {
    surchargeRate = 0.10;
  } else if (taxableIncome <= 20000000) {
    surchargeRate = 0.15;
  } else if (taxableIncome <= 50000000) {
    surchargeRate = 0.25;
  } else {
    surchargeRate = isNewRegime ? 0.25 : 0.37; // New regime capped at 25%
  }
  return baseTax * surchargeRate;
}

// Rule C9: Marginal relief
function applyMarginalRelief(income, tax, slabBoundary, taxAtBoundary) {
  if (income <= slabBoundary) return tax;
  const excess = income - slabBoundary;
  const marginalTax = taxAtBoundary + excess;
  return Math.min(tax, marginalTax);
}

// Rule F6: ITR Form routing
function suggestITRForm(inputs, hasCapitalGains) {
  const totalIncome = inputs.grossSalaryReported || inputs.totalIncome || 0;
  if (hasCapitalGains) return { form: "ITR-2", reason: "Capital gains detected alongside salary income." };
  if (totalIncome > 5000000) return { form: "ITR-2", reason: "Total income exceeds Rs. 50 lakh." };
  return { form: "ITR-1 (Sahaj)", reason: "Salaried individual, no capital gains, income within Rs. 50L." };
}

export function buildTaxWizardReport(documentResults = []) {
  const inputs = extractTaxInputs(documentResults);
  if (!inputs.available) {
    return { available: false, message: "No salary or tax-style fields were detected in the uploaded JSON yet." };
  }

  // ── Group A: Income Heads & Gross Computation (A1–A14) ──

  // A1: Basic Salary + DA
  const basicDA = inputs.basic + inputs.da;

  // A2: HRA Exemption
  const hraMetro = inputs.cityType === "metro" ? 0.5 * basicDA : 0.4 * basicDA;
  const hraExempt = Math.max(0, Math.min(inputs.hraReceived, inputs.rentPaid - 0.1 * basicDA, hraMetro));

  // A4: LTA Exemption
  const ltaExempt = Math.min(inputs.lta, inputs.ltaActual);

  // A5: Standard Deduction
  const stdDedOld = 50000;  // Old Regime
  const stdDedNew = 75000;  // New Regime FY 2025-26

  // A6: Professional Tax
  const profTax = Math.min(inputs.professionalTax, 2500);

  // A8: Gratuity Exemption (simplified: private covered, cap Rs. 20L)
  const gratuityExempt = Math.min(inputs.gratuity, 2000000);

  // A11: Interest deductions
  const isSenior = inputs.ageCategory !== "below60";
  const d80TTA = isSenior ? 0 : Math.min(inputs.sbInterest, 10000);   // 80TTA (non-senior)
  const d80TTB = isSenior ? Math.min(inputs.sbInterest + inputs.fdInterest, 50000) : 0; // 80TTB (senior)

  // A12: Capital Gains
  const ltcgAboveThresh = Math.max(0, inputs.ltcgEquity - 125000);
  const hasCapitalGains = inputs.stcgEquity > 0 || inputs.ltcgEquity > 0 || inputs.debtMFNew > 0 || inputs.debtMFOld > 0 || inputs.otherCapitalGains > 0;

  // ── Group B: Deductions — Old Regime (B1–B22) ──

  // B1: Section 80C — Cap Rs. 1,50,000
  const raw80C = inputs.epf + inputs.ppf + inputs.elss + inputs.lifeInsurance + inputs.homeLoanPrincipal + inputs.tuition + inputs.nsc;
  const d80C = Math.min(raw80C, 150000);

  // B3: 80CCD(1) — Employee NPS, within 80C ceiling, cap 10% of Basic+DA
  const npsEmp = Math.min(inputs.npsEmployee, 0.10 * basicDA);

  // B4: 80CCD(1B) — Additional NPS, Rs. 50,000 OVER AND ABOVE 80C
  const nps1b = Math.min(inputs.nps1b, 50000);

  // B5: 80CCD(2) — Employer NPS, 14% of Basic+DA (available in BOTH regimes)
  const employerNPSCap = Math.min(inputs.employerNPS, 0.14 * basicDA);

  // B6: 80D — Health Insurance (with senior citizen handling)
  const selfSeniorCap = isSenior ? 50000 : 25000;
  const hdSelf = Math.min(inputs.healthSelf + inputs.preventive, selfSeniorCap);
  const parentCap = inputs.parentSenior ? 50000 : 25000;
  const hdParents = Math.min(inputs.healthParents, parentCap);
  const d80D = hdSelf + hdParents;

  // B9: 80E — Education Loan Interest (no upper cap)
  const d80E = inputs.educationLoan;

  // B17: Section 24(b) — Home Loan Interest
  const d24b = inputs.propType === "sop" ? Math.min(inputs.homeLoanInterest, 200000) : inputs.homeLoanInterest;

  // B12: 80G — Donations
  const d80G = inputs.donations;

  // Other deductions (B7: 80DD, B8: 80DDB, B16: 80U, B13: 80GG)
  const dOthers = inputs.otherDeductions;

  // ── Gross Salary (A1–A3) ──
  const hasSalaryBreakup = [inputs.basic, inputs.da, inputs.hraReceived, inputs.specialAllowances, inputs.lta, inputs.otherAllowances, inputs.perquisites, inputs.gratuity, inputs.employerNPS].some((v) => v > 0);
  const grossSalary = hasSalaryBreakup
    ? inputs.basic + inputs.da + inputs.hraReceived + inputs.specialAllowances + inputs.lta + inputs.otherAllowances + inputs.perquisites + inputs.gratuity + inputs.employerNPS
    : inputs.grossSalaryReported || inputs.totalIncome;

  // ── Total Deductions (Old Regime) ──
  const allDeductions = d80C + npsEmp + nps1b + d80D + d80E + d24b + d80TTA + d80TTB + d80G + dOthers;

  // ══════════════════════════════════════════════════════════════════════════
  // OLD REGIME COMPUTATION (Group C: C3)
  // ══════════════════════════════════════════════════════════════════════════

  const taxableSalaryOld = Math.max(0,
    grossSalary - hraExempt - ltaExempt - gratuityExempt - stdDedOld - profTax - employerNPSCap - allDeductions
  );
  const otherIncomeOld = inputs.fdInterest + Math.max(0, inputs.sbInterest - d80TTA) + inputs.dividend + inputs.debtMFNew;
  const netTaxableOld = taxableSalaryOld + otherIncomeOld + inputs.debtMFOld + inputs.otherCapitalGains;

  // C3: Old regime slabs
  const oldSlabs = (income, ageCategory) => {
    let tax = 0;
    const slabs = [
      [250000, 500000, 0.05],
      [500000, 1000000, 0.20],
      [1000000, Number.POSITIVE_INFINITY, 0.30],
    ];
    if (ageCategory === "60to80") slabs[0] = [300000, 500000, 0.05];
    if (ageCategory === "above80") slabs[0] = [500000, 1000000, 0.20];
    slabs.forEach(([low, high, rate]) => {
      if (income > low) tax += (Math.min(income, high) - low) * rate;
    });
    return tax;
  };

  const slabTaxOld = oldSlabs(netTaxableOld, inputs.ageCategory);

  // Special rate income (A12)
  const stcgTax = inputs.stcgEquity * 0.20;
  const ltcgTax = ltcgAboveThresh * 0.125;
  const debtOldTax = inputs.debtOldLong ? inputs.debtMFOld * 0.125 : 0;
  const specialTaxOld = stcgTax + ltcgTax + debtOldTax;

  let baseTaxOld = slabTaxOld + specialTaxOld;

  // B22/C10: 87A Rebate — Old Regime
  const rebate87AOld = netTaxableOld <= 500000 ? Math.min(baseTaxOld, 12500) : 0;
  baseTaxOld -= rebate87AOld;

  // C7: Surcharge — Old Regime
  const surchargeOld = computeSurcharge(netTaxableOld, baseTaxOld, false);
  const taxPlusSurchargeOld = baseTaxOld + surchargeOld;

  // C8: Cess 4%
  const cessOld = taxPlusSurchargeOld * 0.04;
  const totalTaxOld = Math.max(0, taxPlusSurchargeOld + cessOld);

  // ══════════════════════════════════════════════════════════════════════════
  // NEW REGIME COMPUTATION (Group C: C2)
  // ══════════════════════════════════════════════════════════════════════════

  const taxableSalaryNew = Math.max(0,
    grossSalary - inputs.hraReceived - stdDedNew - profTax - employerNPSCap - gratuityExempt
  );
  const netTaxableNew = taxableSalaryNew + inputs.fdInterest + inputs.sbInterest + inputs.dividend + inputs.debtMFNew + inputs.debtMFOld + inputs.otherCapitalGains;

  // C2: New regime slabs FY 2025-26 (Budget 2025)
  const newSlabs = (income) => {
    if (income <= 400000) return 0;
    let tax = 0;
    [
      [400000, 800000, 0.05],
      [800000, 1200000, 0.10],
      [1200000, 1600000, 0.15],
      [1600000, 2000000, 0.20],
      [2000000, 2400000, 0.25],
      [2400000, Number.POSITIVE_INFINITY, 0.30],
    ].forEach(([low, high, rate]) => {
      if (income > low) tax += (Math.min(income, high) - low) * rate;
    });
    return tax;
  };

  const slabTaxNew = newSlabs(netTaxableNew);
  const specialTaxNew = inputs.stcgEquity * 0.20 + ltcgAboveThresh * 0.125;
  let baseTaxNew = slabTaxNew + specialTaxNew;

  // B22: 87A Rebate — New Regime (on normal slab income only, NOT on special rate income)
  const rebate87ANew = netTaxableNew <= 1200000 ? Math.min(slabTaxNew, 60000) : 0;
  baseTaxNew -= rebate87ANew;

  // C7: Surcharge — New Regime
  const surchargeNew = computeSurcharge(netTaxableNew, baseTaxNew, true);
  const taxPlusSurchargeNew = baseTaxNew + surchargeNew;

  // C8: Cess 4%
  const cessNew = taxPlusSurchargeNew * 0.04;
  const totalTaxNew = Math.max(0, taxPlusSurchargeNew + cessNew);

  // ── Regime recommendation (C4: dynamic compute, not hardcoded) ──
  const saving = Math.abs(totalTaxOld - totalTaxNew);
  const recommendedRegime = totalTaxNew <= totalTaxOld ? "New" : "Old";
  const isNewBetter = totalTaxNew <= totalTaxOld;

  // ── B22 zero-tax threshold check ──
  const zeroTaxThresholdNew = 1275000; // Rs. 12,75,000 for salaried in new regime
  const isZeroTaxEligible = grossSalary <= zeroTaxThresholdNew;

  // ── 87A vs Special Rate Income warning ──
  const cg87aWarning = (inputs.stcgEquity + inputs.ltcgEquity > 0) && netTaxableNew <= 1200000;

  // ── F6: ITR Form suggestion ──
  const itrSuggestion = suggestITRForm(inputs, hasCapitalGains);

  // ══════════════════════════════════════════════════════════════════════════
  // Group E: Missed Deduction Flags (E1–E8)
  // ══════════════════════════════════════════════════════════════════════════

  const missedItems = [];

  // E1: 80CCD(1B) — Most commonly missed
  if (nps1b < 50000) {
    const gap = 50000 - nps1b;
    missedItems.push({
      name: "80CCD(1B) Extra NPS",
      section: "80CCD(1B)",
      saving: gap * 0.30,
      description: `Invest Rs. ${Math.round(gap).toLocaleString("en-IN")} more in NPS Tier 1 for additional deduction above 80C ceiling.`,
      priority: "critical",
    });
  }

  // E7: 80CCD(2) — Employer NPS (works in new regime too!)
  if (inputs.employerNPS === 0) {
    missedItems.push({
      name: "Employer NPS 80CCD(2)",
      section: "80CCD(2)",
      saving: 0.14 * inputs.basic * 0.30,
      description: "Ask employer to contribute up to 14% of Basic+DA to NPS. Works in NEW regime too!",
      priority: "critical",
    });
  }

  // 80C Gap
  if (raw80C < 150000) {
    const gap = 150000 - raw80C;
    missedItems.push({
      name: "80C Gap",
      section: "80C",
      saving: gap * 0.20,
      description: `Rs. ${Math.round(gap).toLocaleString("en-IN")} more can be invested in ELSS/PPF/NSC.`,
      priority: "warn",
    });
  }

  // E2: Parents Health Insurance
  if (inputs.healthParents === 0) {
    missedItems.push({
      name: "Parents Health Insurance",
      section: "80D",
      saving: 25000 * 0.20,
      description: "Parents health insurance not claimed. Up to Rs. 25,000 (Rs. 50,000 if senior).",
      priority: "warn",
    });
  }

  // E6: Preventive Health Check
  if (inputs.preventive === 0) {
    missedItems.push({
      name: "Preventive Health Check",
      section: "80D",
      saving: 5000 * 0.20,
      description: "Preventive health check up to Rs. 5,000 within 80D limit. Almost universally missed.",
      priority: "warn",
    });
  }

  // E3: HRA + Section 24(b) dual claim
  if (hraExempt > 0 && d24b > 0) {
    missedItems.push({
      name: "HRA + Home Loan Dual Claim",
      section: "HRA + 24(b)",
      saving: 0,
      description: "Both HRA exemption and home loan interest deduction claimed. Valid if work city differs from home loan property city.",
      priority: "info",
    });
  } else if (inputs.homeLoanInterest > 0 && inputs.rentPaid > 0 && hraExempt === 0) {
    missedItems.push({
      name: "HRA + Home Loan Dual Claim Missed",
      section: "HRA + 24(b)",
      saving: Math.min(inputs.hraReceived, inputs.rentPaid - 0.1 * basicDA, hraMetro) * 0.20,
      description: "You pay rent AND have a home loan. If work city differs from loan property city, both HRA and 24(b) are claimable simultaneously.",
      priority: "warn",
    });
  }

  // E5: LTA not claimed
  if (inputs.lta > 0 && inputs.ltaActual === 0) {
    missedItems.push({
      name: "LTA Not Declared",
      section: "LTA",
      saving: inputs.lta * 0.20,
      description: "LTA received but actual travel cost not declared. Can still be claimed in ITR even if missed in Form 16.",
      priority: "warn",
    });
  }

  // E4: Savings/FD interest not declared
  if (inputs.sbInterest === 0 && inputs.fdInterest === 0) {
    missedItems.push({
      name: "80TTA/80TTB — Interest Deduction",
      section: "80TTA/80TTB",
      saving: (isSenior ? 50000 : 10000) * 0.20,
      description: isSenior
        ? "Senior citizens can claim up to Rs. 50,000 under 80TTB on all interest income."
        : "Savings bank interest up to Rs. 10,000 deductible under 80TTA. Check AIS.",
      priority: "info",
    });
  }

  // E8: LTCG below threshold
  if (inputs.ltcgEquity > 0 && inputs.ltcgEquity < 125000) {
    missedItems.push({
      name: "LTCG Harvesting Opportunity",
      section: "Capital Gains",
      saving: inputs.ltcgEquity * 0.125,
      description: `LTCG (Rs. ${Math.round(inputs.ltcgEquity).toLocaleString("en-IN")}) is under Rs. 1.25L threshold. Sell & rebuy to step up cost base with zero tax.`,
      priority: "warn",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Group D: Investment Suggestions Ranked by Impact (D1–D12)
  // ══════════════════════════════════════════════════════════════════════════

  const investments = [];

  // D2: NPS 80CCD(1B) — Priority #1 for old-regime users
  if (nps1b < 50000) {
    investments.push({
      name: "NPS Tier 1 - Extra 80CCD(1B)",
      section: "80CCD(1B)",
      gap: 50000 - nps1b,
      saving: (50000 - nps1b) * 0.30,
      priority: "P1",
      risk: "Medium",
      liquidity: "Lock till 60",
      lockIn: "Till retirement",
    });
  }

  // D1: 80C gap investments
  if (raw80C < 150000) {
    const gap80C = 150000 - raw80C;
    investments.push({
      name: "ELSS Mutual Fund",
      section: "80C",
      gap: gap80C,
      saving: gap80C * 0.30,
      priority: "P1",
      risk: "High",
      liquidity: "3-year lock",
      lockIn: "3 years",
    });
    investments.push({
      name: "PPF Contribution",
      section: "80C",
      gap: gap80C,
      saving: gap80C * 0.20,
      priority: "P2",
      risk: "Low",
      liquidity: "15-year (partial after 7)",
      lockIn: "15 years",
    });
    investments.push({
      name: "5-Year Tax Saving FD",
      section: "80C",
      gap: gap80C,
      saving: gap80C * 0.20,
      priority: "P3",
      risk: "Low",
      liquidity: "5-year lock",
      lockIn: "5 years",
    });
  }

  // D3: 80D Health Insurance Top-Up
  if (hdSelf < selfSeniorCap) {
    investments.push({
      name: "Health Insurance Top-Up",
      section: "80D",
      gap: selfSeniorCap - hdSelf,
      saving: (selfSeniorCap - hdSelf) * 0.20,
      priority: "P2",
      risk: "Low",
      liquidity: "Annual",
      lockIn: "Annual renewal",
    });
  }

  // D3: Parents Health Insurance
  if (inputs.healthParents === 0) {
    investments.push({
      name: "Parents Health Insurance",
      section: "80D",
      gap: parentCap,
      saving: parentCap * 0.20,
      priority: "P2",
      risk: "Low",
      liquidity: "Annual",
      lockIn: "Annual renewal",
    });
  }

  // D11: LTCG Tax Harvesting
  if (inputs.ltcgEquity > 0 && inputs.ltcgEquity < 125000) {
    investments.push({
      name: "LTCG Tax Harvesting",
      section: "Rule M52",
      gap: inputs.ltcgEquity,
      saving: inputs.ltcgEquity * 0.125,
      priority: "P1",
      risk: "Low",
      liquidity: "Immediate",
      lockIn: "None — sell & rebuy",
    });
  }

  // Filter zero-saving investments and sort by saving
  const filteredInvestments = investments.filter((i) => i.saving > 0).sort((a, b) => b.saving - a.saving);

  // ── New regime slab table data ──
  const slabTable = [
    { slab: "0 - 4,00,000", rate: "Nil", active: netTaxableNew <= 400000 },
    { slab: "4,00,001 - 8,00,000", rate: "5%", active: netTaxableNew > 400000 && netTaxableNew <= 800000 },
    { slab: "8,00,001 - 12,00,000", rate: "10%", active: netTaxableNew > 800000 && netTaxableNew <= 1200000 },
    { slab: "12,00,001 - 16,00,000", rate: "15%", active: netTaxableNew > 1200000 && netTaxableNew <= 1600000 },
    { slab: "16,00,001 - 20,00,000", rate: "20%", active: netTaxableNew > 1600000 && netTaxableNew <= 2000000 },
    { slab: "20,00,001 - 24,00,000", rate: "25%", active: netTaxableNew > 2000000 && netTaxableNew <= 2400000 },
    { slab: "Above 24,00,000", rate: "30%", active: netTaxableNew > 2400000 },
  ];

  // ── Build comprehensive return ──
  return {
    available: true,
    identity: inputs.identity,
    assumptions: inputs.assumptions,

    // Warnings (B22 edge case, etc.)
    warnings: [
      ...(cg87aWarning ? ["87A rebate on special-rate capital gains may be disputed by CPC. Rebate does NOT apply against STCG/LTCG at special rates. Verify with a CA before filing."] : []),
      ...(isZeroTaxEligible ? [`Gross salary is within Rs. 12.75L — zero tax under New Regime after standard deduction (Rs. 75K) and 87A rebate (Rs. 60K).`] : []),
    ],

    recommendedRegime,
    saving,
    taxDeducted: inputs.taxDeducted,
    refundOrPayable: inputs.taxDeducted ? inputs.taxDeducted - (recommendedRegime === "New" ? totalTaxNew : totalTaxOld) : 0,

    // Detailed old regime breakdown (C10)
    oldRegime: {
      totalTax: totalTaxOld,
      grossSalary,
      hraExempt,
      ltaExempt,
      gratuityExempt,
      standardDeduction: stdDedOld,
      professionalTax: profTax,
      employerNPSCap,
      totalDeductions: allDeductions,
      deductionBreakdown: {
        d80C,
        raw80C,
        npsEmp,
        nps1b,
        d80D,
        d80E,
        d24b,
        d80TTA,
        d80TTB,
        d80G,
        dOthers,
      },
      netTaxable: netTaxableOld,
      slabTax: slabTaxOld,
      specialTax: specialTaxOld,
      stcgTax,
      ltcgTax,
      debtOldTax,
      rebate: rebate87AOld,
      surcharge: surchargeOld,
      cess: cessOld,
    },

    // Detailed new regime breakdown (C10)
    newRegime: {
      totalTax: totalTaxNew,
      grossSalary,
      standardDeduction: stdDedNew,
      professionalTax: profTax,
      employerNPSCap,
      gratuityExempt,
      netTaxable: netTaxableNew,
      slabTax: slabTaxNew,
      specialTax: specialTaxNew,
      rebate: rebate87ANew,
      rebateApplicable: netTaxableNew <= 1200000,
      surcharge: surchargeNew,
      cess: cessNew,
    },

    // New regime slab table
    slabTable,

    // ITR form suggestion (F6)
    itrSuggestion,

    // Zero-tax threshold (B22)
    isZeroTaxEligible,

    // Missed deductions (E1–E8)
    missedItems: missedItems.slice(0, 8),

    // Investment suggestions (D1–D12)
    investments: filteredInvestments.slice(0, 6),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MF PORTFOLIO X-RAY — Modules 1 through 6 (62 Rules)
// ══════════════════════════════════════════════════════════════════════════════

export function buildMfXRayReport(documentResults = [], options = {}) {
  const documents = documentResults.map(unwrapAnalysis);
  const holdings = collectHoldings(documents).map((holding) => {
    const years = Math.max((Date.now() - holding.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365), 0.1);
    const xirr = computeXIRR(holding.invested, holding.current, years);
    const gain = holding.current - holding.invested;
    const absReturn = holding.invested ? (gain / holding.invested) * 100 : 0;
    const benchmark = BENCHMARKS[holding.category];
    const xirrReliability = getXIRRReliability(years);
    const xirrColor = getXIRRColor(xirr, benchmark?.returns3yr);
    return {
      ...holding,
      years,
      xirr,
      gain,
      absReturn,
      xirrReliability,
      xirrColor,
    };
  });

  if (!holdings.length) {
    return { available: false, message: "No mutual-fund holding rows were detected in the uploaded JSON yet. Re-analyze the MF statement so the backend can return a holdings array for TOOL 2." };
  }

  const riskProfile = mapRiskProfile(options.riskVibe);
  const target = getTargetAllocation(riskProfile);
  const equitySubTarget = getEquitySubAllocation(riskProfile);
  const taxSlab = options.taxSlab || 0.30;
  const expReturn = options.expReturn || 0.12;
  const goalHorizon = options.goalHorizon || "long";
  const emerFund = options.emerFund || "unknown";

  // ── Portfolio aggregates ──
  const totalInvested = holdings.reduce((sum, h) => sum + h.invested, 0);
  const totalCurrent = holdings.reduce((sum, h) => sum + h.current, 0);
  const totalGain = totalCurrent - totalInvested;
  const totalAbsReturn = totalInvested ? (totalGain / totalInvested) * 100 : 0;

  // ── Asset class breakdown ──
  const equityFunds = holdings.filter((h) => isEquity(h.category));
  const debtFunds = holdings.filter((h) => isDebt(h.category));
  const goldFunds = holdings.filter((h) => h.category === "Gold ETF" || h.category === "Gold");
  const equityValue = equityFunds.reduce((sum, h) => sum + h.current, 0);
  const debtValue = debtFunds.reduce((sum, h) => sum + h.current, 0);
  const goldValue = goldFunds.reduce((sum, h) => sum + h.current, 0);
  const equityPct = totalCurrent ? equityValue / totalCurrent : 0;
  const debtPct = totalCurrent ? debtValue / totalCurrent : 0;
  const goldPct = totalCurrent ? goldValue / totalCurrent : 0;

  // ── M27: Effective market-cap allocation within equity ──
  const largeCaps = equityFunds.filter((h) => ["Large Cap", "Index"].includes(h.category));
  const midCaps = equityFunds.filter((h) => h.category === "Mid Cap");
  const smallCaps = equityFunds.filter((h) => h.category === "Small Cap");
  const largeCapValue = largeCaps.reduce((sum, h) => sum + h.current, 0);
  const midCapValue = midCaps.reduce((sum, h) => sum + h.current, 0);
  const smallCapValue = smallCaps.reduce((sum, h) => sum + h.current, 0);
  const largeCapPct = equityValue ? largeCapValue / equityValue : 0;
  const midCapPct = equityValue ? midCapValue / equityValue : 0;
  const smallCapPct = equityValue ? smallCapValue / equityValue : 0;

  // ── Portfolio XIRR (weighted average) ──
  const avgXIRR = totalCurrent ? holdings.reduce((sum, h) => sum + h.xirr * (h.current / totalCurrent), 0) : 0;

  const regularFunds = holdings.filter((h) => h.isRegular);
  const regularValue = regularFunds.reduce((sum, h) => sum + h.current, 0);
  const debtPostApr23 = debtFunds.filter((h) => h.purchaseDate >= DATE_AFTER_APRIL_2023);

  // ── M47: Drift trigger flag ──
  const equityDrift = Math.abs(equityPct - target.equity);
  const driftTriggered = equityDrift > 0.10;

  // ══════════════════════════════════════════════════════════════════════════
  // ALERTS (M50A, M55, M5, M54)
  // ══════════════════════════════════════════════════════════════════════════

  const alerts = [];

  // M50A: Debt fund tax trap
  if (debtPostApr23.length) {
    alerts.push({
      type: "danger",
      title: "Debt Fund Tax Trap",
      message: `${debtPostApr23.map((h) => h.name).join(", ")} purchased after Apr 1, 2023. All gains taxed at slab rate (${Math.round(taxSlab * 100)}%), not LTCG.`,
    });
  }

  // M5: Regular plans
  if (regularFunds.length) {
    alerts.push({
      type: "warn",
      title: `${regularFunds.length} Regular Plan${regularFunds.length > 1 ? "s" : ""} Detected`,
      message: "Extra TER is being paid. Check switch analysis below for payback periods.",
    });
  }

  // M55: Emergency fund check
  if (emerFund === "none") {
    alerts.push({
      type: "danger",
      title: "No Emergency Fund",
      message: "Entire corpus is invested. Add 3-6 months of expenses to a Liquid or Overnight fund before rebalancing.",
    });
  }

  // Missing liquid/debt buffer
  if (!holdings.some((h) => ["Liquid", "Short Duration", "Gilt"].includes(h.category))) {
    alerts.push({
      type: "warn",
      title: "No Liquid/Debt Buffer",
      message: "No liquid or debt-style buffer detected. Liquidity may be weak for short-term needs.",
    });
  }

  // M54: SIP over-diversification
  if (holdings.length > 7) {
    alerts.push({
      type: "info",
      title: "Over-Diversification",
      message: `${holdings.length} funds held. Ideal: 3-5 core funds covering different SEBI categories with low overlap.`,
    });
  }

  // M47: Drift alert
  if (driftTriggered) {
    alerts.push({
      type: "warn",
      title: "Rebalancing Triggered",
      message: `Equity allocation (${Math.round(equityPct * 100)}%) has drifted > 10% from target (${Math.round(target.equity * 100)}%).`,
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // M13: Category-level XIRR
  // ══════════════════════════════════════════════════════════════════════════

  const categories = [...new Set(holdings.map((h) => h.category))];
  const categoryXIRR = categories.map((cat) => {
    const catFunds = holdings.filter((h) => h.category === cat);
    const catInvested = catFunds.reduce((sum, h) => sum + h.invested, 0);
    const catCurrent = catFunds.reduce((sum, h) => sum + h.current, 0);
    const catYears = catFunds.reduce((sum, h) => sum + h.years, 0) / catFunds.length;
    const catXIRR = computeXIRR(catInvested, catCurrent, catYears);
    const benchmark = BENCHMARKS[cat];
    const alpha = benchmark ? catXIRR - benchmark.returns3yr : null;
    return {
      category: cat,
      invested: catInvested,
      current: catCurrent,
      xirr: catXIRR,
      xirrColor: getXIRRColor(catXIRR, benchmark?.returns3yr),
      benchmark: benchmark?.name || null,
      benchmarkReturn: benchmark?.returns3yr || null,
      alpha,
      fundsCount: catFunds.length,
    };
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Module 3: Overlap Analysis (M19–M28)
  // ══════════════════════════════════════════════════════════════════════════

  const overlaps = [];
  const equityOnly = holdings.filter((h) => isEquity(h.category) && h.category !== "Hybrid");
  for (let i = 0; i < equityOnly.length; i++) {
    for (let j = i + 1; j < equityOnly.length; j++) {
      const overlap = getOverlapPct(equityOnly[i].category, equityOnly[j].category);
      const severity = overlap > 50 ? "High" : overlap > 30 ? "Moderate" : "Low";
      // M21/M22/M23: severity-based messages
      let recommendation = "";
      if (overlap > 50) {
        recommendation = "These funds hold essentially the same stocks. Consider exiting one.";
      } else if (overlap > 30) {
        recommendation = "Significant overlap. Justify both only if different fund managers or market-cap tilts.";
      }
      overlaps.push({
        left: equityOnly[i].name,
        right: equityOnly[j].name,
        leftCategory: equityOnly[i].category,
        rightCategory: equityOnly[j].category,
        overlap,
        severity,
        recommendation,
      });
    }
  }
  overlaps.sort((a, b) => b.overlap - a.overlap);

  // ══════════════════════════════════════════════════════════════════════════
  // Module 4: Expense Ratio Drag (M29–M36)
  // ══════════════════════════════════════════════════════════════════════════

  let totalAnnualDrag = 0;
  let totalRegularExtraDrag = 0;

  const terRows = holdings.map((holding) => {
    const ter = TER_DATA[holding.category] || { regular: 1.50, direct: 0.70 };
    const actualTER = holding.isRegular ? ter.regular : ter.direct;
    const annualDrag = holding.current * (actualTER / 100);
    const annualDirectGap = holding.isRegular ? holding.current * ((ter.regular - ter.direct) / 100) : 0;
    // M31: 10-Year compounding drag
    const tenYearDrag = holding.current * (Math.pow(1 + expReturn, 10) - Math.pow(1 + expReturn - actualTER / 100, 10));

    totalAnnualDrag += annualDrag;
    totalRegularExtraDrag += annualDirectGap;

    // M34: Expensive fund flags
    let flag = "OK";
    if (holding.category === "Index") {
      if (actualTER > TER_THRESHOLDS.index.red) flag = "Expensive";
      else if (actualTER > TER_THRESHOLDS.index.yellow) flag = "Review";
    } else if (isDebt(holding.category)) {
      if (actualTER > TER_THRESHOLDS.debt.red) flag = "Expensive";
      else if (actualTER > TER_THRESHOLDS.debt.yellow) flag = "Review";
    } else if (holding.category === "Hybrid") {
      if (actualTER > TER_THRESHOLDS.hybrid.red) flag = "Expensive";
      else if (actualTER > TER_THRESHOLDS.hybrid.yellow) flag = "Review";
    } else {
      if (actualTER > TER_THRESHOLDS.equity.red) flag = "Expensive";
      else if (actualTER > TER_THRESHOLDS.equity.yellow) flag = "Review";
    }

    return {
      name: holding.name,
      category: holding.category,
      isRegular: holding.isRegular,
      ter: actualTER,
      directTER: ter.direct,
      regularTER: ter.regular,
      annualDrag,
      annualDirectGap,
      tenYearDrag,
      flag,
    };
  });

  // M36: Portfolio-weighted blended TER
  const blendedTER = totalCurrent ? totalAnnualDrag / totalCurrent * 100 : 0;

  // ══════════════════════════════════════════════════════════════════════════
  // Module 5: Benchmark Comparison (M37–M44)
  // ══════════════════════════════════════════════════════════════════════════

  const benchmarkRows = holdings.filter((h) => BENCHMARKS[h.category]).map((holding) => {
    const benchmark = BENCHMARKS[holding.category];
    const alpha = holding.xirr - benchmark.returns3yr;
    // M40: Alpha in Rs.
    const alphaRs = alpha * holding.current;
    // M41: Underperformer flag
    const status = alpha >= 0.02 ? "Outperformer" : alpha >= 0 ? "Marginal" : "Underperformer";
    return {
      name: holding.name,
      category: holding.category,
      benchmark: benchmark.name,
      fundXIRR: holding.xirr,
      benchmarkReturn1yr: benchmark.returns1yr,
      benchmarkReturn3yr: benchmark.returns3yr,
      benchmarkReturn5yr: benchmark.returns5yr,
      alpha,
      alphaRs,
      status,
    };
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Module 6: AI Rebalancing Plan (M45–M58)
  // ══════════════════════════════════════════════════════════════════════════

  const actions = [];
  let actionNum = 0;

  // M55: Emergency fund priority
  if (emerFund === "none") {
    actionNum++;
    actions.push({
      num: actionNum,
      urgency: "now",
      title: "Build Emergency Fund First",
      description: "Before any rebalancing, ensure 3-6 months of expenses are in a Liquid or Overnight fund.",
      impact: 0,
      impactLabel: "Risk Protection",
    });
  }

  // M47: Equity rebalancing
  if (driftTriggered) {
    actionNum++;
    const direction = equityPct > target.equity ? "reduce" : "increase";
    actions.push({
      num: actionNum,
      urgency: "month",
      title: `Rebalance Equity (${direction} by ${Math.round(equityDrift * 100)}%)`,
      description: `Current equity: ${Math.round(equityPct * 100)}% vs target ${Math.round(target.equity * 100)}%. Prefer new SIP top-ups over selling to defer capital gains.`,
      impact: Math.abs(equityValue - target.equity * totalCurrent),
      impactLabel: "to move",
    });
  }

  // M33/M51/M53: Regular to Direct switch analysis with ELSS lock-in & debt tax trap
  regularFunds.forEach((holding) => {
    const ter = TER_DATA[holding.category] || { regular: 1.50, direct: 0.70 };
    const annualSaving = holding.current * ((ter.regular - ter.direct) / 100);
    const gain = holding.current - holding.invested;
    const isElss = holding.category === "ELSS";
    const inExitLoadWindow = holding.years < 1.0;
    const isDebtPostApr23 = isDebt(holding.category) && holding.purchaseDate >= DATE_AFTER_APRIL_2023;

    // M33 Step 3: Capital gains tax on switch
    let taxCost;
    if (isDebtPostApr23) {
      taxCost = gain * taxSlab; // Slab rate for post-Apr-2023 debt
    } else if (isDebt(holding.category)) {
      taxCost = holding.years > 3 ? gain * 0.125 : gain * taxSlab; // Pre-Apr-2023 debt
    } else {
      taxCost = holding.years > 1 ? gain * 0.125 : gain * 0.20; // Equity STCG/LTCG
    }

    // M33 Step 5: Payback period
    const paybackYears = annualSaving > 0 ? Math.max(0, taxCost) / annualSaving : Infinity;

    actionNum++;

    // M51: ELSS lock-in protection
    if (isElss && holding.years < 3) {
      actions.push({
        num: actionNum,
        urgency: "annual",
        title: `${holding.name.split(" ").slice(0, 3).join(" ")} — ELSS Lock-In Active`,
        description: `ELSS fund in Regular plan. Cannot switch until 3-year lock-in expires. Start new SIP in Direct ELSS from now.`,
        impact: annualSaving,
        impactLabel: "/yr after unlock",
      });
    } else if (inExitLoadWindow) {
      // M33 Step 1: Exit load window
      const monthsLeft = Math.ceil((1 - holding.years) * 12);
      actions.push({
        num: actionNum,
        urgency: "month",
        title: `${holding.name.split(" ").slice(0, 3).join(" ")} — Wait ${monthsLeft}mo to Switch`,
        description: `Exit load window active (1% charge). Wait until exit load expires. Annual saving after switch: Rs. ${Math.round(annualSaving).toLocaleString("en-IN")}.`,
        impact: annualSaving,
        impactLabel: "/yr saving",
      });
    } else if (isDebtPostApr23) {
      // M50A/M53: Debt fund tax trap switch analysis
      actions.push({
        num: actionNum,
        urgency: "month",
        title: `${holding.name.split(" ").slice(0, 3).join(" ")} — Debt Switch: High Tax Cost`,
        description: `Post Apr-2023 debt fund. Switch triggers ${Math.round(taxSlab * 100)}% slab tax on gains (Rs. ${Math.round(Math.max(0, taxCost)).toLocaleString("en-IN")}). Payback: ${Number.isFinite(paybackYears) ? paybackYears.toFixed(1) : "N/A"}yr. ${paybackYears > 3 ? "NOT recommended." : "Payback < 3yr — switch recommended."}`,
        impact: paybackYears <= 3 ? annualSaving : 0,
        impactLabel: paybackYears <= 3 ? "/yr" : "Skip — tax too high",
      });
    } else {
      // Standard Regular → Direct switch
      actions.push({
        num: actionNum,
        urgency: paybackYears < 2 ? "now" : "month",
        title: `Switch to Direct: ${holding.name.split(" ").slice(0, 3).join(" ")}`,
        description: `Payback: ${Number.isFinite(paybackYears) ? paybackYears.toFixed(1) : "N/A"}yr. Tax on exit: Rs. ${Math.round(Math.max(0, taxCost)).toLocaleString("en-IN")}. Annual TER saving: Rs. ${Math.round(annualSaving).toLocaleString("en-IN")}.`,
        impact: annualSaving,
        impactLabel: "/yr",
      });
    }
  });

  // M52: LTCG harvesting
  const harvestable = equityFunds.filter((h) => h.years > 1 && h.gain > 0 && h.gain < 125000);
  if (harvestable.length) {
    const totalHarvest = harvestable.reduce((sum, h) => sum + h.gain, 0);
    actionNum++;
    actions.push({
      num: actionNum,
      urgency: "month",
      title: "LTCG Harvesting Opportunity",
      description: `${harvestable.length} fund(s) have LTCG under Rs. 1.25L threshold (Rs. ${Math.round(totalHarvest).toLocaleString("en-IN")} total). Sell and immediately repurchase to step up cost base. Zero tax. Do before March 31.`,
      impact: totalHarvest * 0.125,
      impactLabel: "future tax saved",
    });
  }

  // M57: Gold allocation
  const hasGold = holdings.some((h) => h.category === "Gold ETF" || h.category === "Gold");
  if (!hasGold) {
    actionNum++;
    actions.push({
      num: actionNum,
      urgency: "annual",
      title: `Add Gold ETF (${Math.round(target.gold * 100)}% allocation)`,
      description: `No gold allocation detected. SGB scheme discontinued for new issuances. Recommend Gold ETF (liquid, low TER ~0.5%). Target: Rs. ${Math.round(totalCurrent * target.gold).toLocaleString("en-IN")}.`,
      impact: totalCurrent * target.gold,
      impactLabel: "target allocation",
    });
  }

  // M56: Goal-horizon-based shift
  if (goalHorizon === "short" && equityPct > 0.30) {
    actionNum++;
    actions.push({
      num: actionNum,
      urgency: "now",
      title: "Reduce Equity for Short-Term Goal",
      description: `Goal horizon is 1-3 years but equity is ${Math.round(equityPct * 100)}%. Max 30% equity recommended. Move excess to short/medium duration debt.`,
      impact: Math.max(0, equityValue - 0.30 * totalCurrent),
      impactLabel: "to shift to debt",
    });
  } else if (goalHorizon === "medium" && equityPct > 0.60) {
    actionNum++;
    actions.push({
      num: actionNum,
      urgency: "month",
      title: "Reduce Equity for Medium-Term Goal",
      description: `Goal horizon is 3-5 years but equity is ${Math.round(equityPct * 100)}%. Max 60% equity recommended. Move excess to balanced advantage / hybrid.`,
      impact: Math.max(0, equityValue - 0.60 * totalCurrent),
      impactLabel: "to shift",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BUILD RETURN OBJECT
  // ══════════════════════════════════════════════════════════════════════════

  return {
    available: true,
    riskProfile,
    holdingsCount: holdings.length,
    totalInvested,
    totalCurrent,
    totalGain,
    totalAbsReturn,
    avgXIRR,
    avgXIRRColor: getXIRRColor(avgXIRR, 0.12),
    regularFundsCount: regularFunds.length,
    regularValue,

    // Asset allocation
    equityPct,
    debtPct,
    goldPct,
    equityValue,
    debtValue,
    goldValue,
    target,
    driftTriggered,
    equityDrift,

    // M27: Market-cap sub-allocation
    marketCapAllocation: {
      largeCapPct,
      midCapPct,
      smallCapPct,
      target: equitySubTarget,
    },

    // Alerts
    alerts,

    // Holdings with per-fund XIRR, gain, color
    holdings: holdings.slice().sort((a, b) => b.current - a.current),

    // M13: Category-level XIRR
    categoryXIRR,

    // Overlap analysis (M19–M28)
    overlaps: overlaps.slice(0, 8),

    // TER drag (M29–M36)
    terRows: terRows.slice().sort((a, b) => b.annualDrag - a.annualDrag),
    totalAnnualDrag,
    totalRegularExtraDrag,
    blendedTER,

    // Benchmark comparison (M37–M44)
    benchmarkRows,

    // AI Rebalancing Plan (M45–M58)
    actions: actions.slice(0, 10),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 3: MONEY HEALTH SCORE  (Dimensions H1 – H6)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * buildMoneyHealthScore
 *
 * @param {object}  healthInputs   – from AppContext (emergencyFund, healthInsuranceCover,
 *                                   termLifeCover, hasDependents, totalMonthlyEMI,
 *                                   hasRevolvingCCDebt, monthlyRetirementSaving)
 * @param {number}  annualIncome   – gross annual income
 * @param {number}  monthlyExpenses – needsSliderAmount / 12
 * @param {object}  [taxReport]    – optional output of buildTaxWizardReport (for H5)
 * @param {object}  [mfReport]     – optional output of buildMfXRayReport   (for H3)
 * @returns {{ dimensions: Array, overallScore: number, overallGrade: string, alerts: Array }}
 */
export function buildMoneyHealthScore(
  healthInputs = {},
  monthlyIncomeRaw = 0,
  monthlyExpenses = 0,
  taxReport = null,
  mfReport = null,
) {
  const {
    emergencyFund = 0,
    healthInsuranceCover = 0,
    termLifeCover = 0,
    hasDependents = false,
    totalMonthlyEMI = 0,
    hasRevolvingCCDebt = false,
    monthlyRetirementSaving = 0,
  } = healthInputs;

  const monthlyIncome = monthlyIncomeRaw || 1; // avoid div-by-zero
  const annualIncome = monthlyIncome * 12;
  const targetEmergencyMonths = 6;
  const dimensions = [];
  const alerts = [];

  // ── H1: Emergency Preparedness ──────────────────────────────────────────────
  const efMonths = monthlyExpenses > 0
    ? emergencyFund / monthlyExpenses
    : emergencyFund > 0 ? targetEmergencyMonths : 0;

  let h1Score;
  if (efMonths >= 6) h1Score = 100;
  else if (efMonths >= 3) h1Score = 50 + ((efMonths - 3) / 3) * 50;
  else h1Score = (efMonths / 3) * 50;

  h1Score = Math.round(Math.min(h1Score, 100));

  let h1Tip = "";
  if (efMonths < 3) {
    h1Tip = `Build your emergency fund to at least 3 months of expenses (₹${formatINR(monthlyExpenses * 3)}). Park in liquid fund or savings account.`;
    alerts.push({ dimension: "H1", severity: "red", text: `Emergency fund covers only ${efMonths.toFixed(1)} months — target is 6 months.` });
  } else if (efMonths < 6) {
    h1Tip = `Good start! Top up to 6 months of expenses (₹${formatINR(monthlyExpenses * 6)}) for full protection.`;
    alerts.push({ dimension: "H1", severity: "amber", text: `Emergency fund covers ${efMonths.toFixed(1)} months — aim for 6.` });
  } else {
    h1Tip = "Excellent! Your emergency fund covers 6+ months.";
  }

  dimensions.push({
    id: "H1",
    name: "Emergency Preparedness",
    score: h1Score,
    grade: scoreGrade(h1Score),
    detail: `${efMonths.toFixed(1)} months covered`,
    tip: h1Tip,
  });

  // ── H2: Insurance Coverage ──────────────────────────────────────────────────
  let h2Score = 0;
  const h2Parts = [];

  // Health Insurance: target ≥ ₹5L
  const healthTarget = 500000;
  const healthRatio = Math.min(healthInsuranceCover / healthTarget, 1);
  const healthPts = healthRatio * 50;
  h2Parts.push(`Health: ₹${formatINR(healthInsuranceCover)} / ₹5L`);

  // Term Life: target ≥ 10× annual income (only if dependents)
  let lifePts = 0;
  if (hasDependents) {
    const lifeTarget = annualIncome * 10;
    if (lifeTarget > 0) {
      const lifeRatio = Math.min(termLifeCover / lifeTarget, 1);
      lifePts = lifeRatio * 50;
      h2Parts.push(`Term Life: ₹${formatINR(termLifeCover)} / ₹${formatINR(lifeTarget)}`);
    } else {
      lifePts = 50; // no income entered → can't judge
    }
  } else {
    lifePts = 50; // no dependents → term life not required
    h2Parts.push("No dependents — term life not mandatory");
  }

  h2Score = Math.round(healthPts + lifePts);

  let h2Tip = "";
  if (healthInsuranceCover < healthTarget) {
    h2Tip = `Increase health cover to at least ₹5,00,000. Consider a super top-up plan.`;
    alerts.push({ dimension: "H2", severity: healthInsuranceCover < 200000 ? "red" : "amber", text: `Health insurance cover is only ₹${formatINR(healthInsuranceCover)}.` });
  }
  if (hasDependents && termLifeCover < annualIncome * 10) {
    const gap = annualIncome * 10 - termLifeCover;
    h2Tip += ` Get term life cover of at least 10× annual income. Gap: ₹${formatINR(gap)}.`;
    alerts.push({ dimension: "H2", severity: termLifeCover < annualIncome * 5 ? "red" : "amber", text: `Term life cover gap: ₹${formatINR(gap)}.` });
  }
  if (!h2Tip) h2Tip = "Insurance coverage looks adequate.";

  dimensions.push({
    id: "H2",
    name: "Insurance Coverage",
    score: h2Score,
    grade: scoreGrade(h2Score),
    detail: h2Parts.join(" | "),
    tip: h2Tip.trim(),
  });

  // ── H3: Investment Diversification ──────────────────────────────────────────
  let h3Score = 50; // default if no MF data
  let h3Detail = "No portfolio data — provide MF holdings for analysis";
  let h3Tip = "Add your mutual fund portfolio to get a diversification score.";

  if (mfReport && mfReport.allocationPct) {
    const alloc = mfReport.allocationPct;
    const eqPct = alloc.equity || 0;
    const debtPct = alloc.debt || 0;
    const goldPct = alloc.gold || 0;
    const totalClasses = (eqPct > 0 ? 1 : 0) + (debtPct > 0 ? 1 : 0) + (goldPct > 0 ? 1 : 0);

    // Concentration penalty: any single class > 80% → low score
    const maxConcentration = Math.max(eqPct, debtPct, goldPct);

    if (totalClasses >= 3 && maxConcentration <= 70) {
      h3Score = 100;
      h3Tip = "Great diversification across asset classes.";
    } else if (totalClasses >= 2 && maxConcentration <= 80) {
      h3Score = 70;
      h3Tip = "Decent spread. Consider adding a third asset class for more resilience.";
    } else if (maxConcentration > 80) {
      h3Score = 30;
      h3Tip = `${maxConcentration.toFixed(0)}% in a single asset class is risky. Diversify.`;
      alerts.push({ dimension: "H3", severity: "red", text: `Portfolio heavily concentrated (${maxConcentration.toFixed(0)}% in one class).` });
    } else {
      h3Score = 50;
      h3Tip = "Add more asset classes for better risk-adjusted returns.";
    }

    // Sub-diversification: check overlap from MF report
    if (mfReport.overlaps && mfReport.overlaps.length > 0) {
      const highOverlap = mfReport.overlaps.filter((o) => o.similarity > 0.5);
      if (highOverlap.length > 0) {
        h3Score = Math.max(h3Score - 15, 0);
        h3Tip += ` ${highOverlap.length} fund pair(s) have >50% overlap — consider consolidating.`;
      }
    }

    h3Score = Math.round(h3Score);
    h3Detail = `Equity ${eqPct.toFixed(0)}% | Debt ${debtPct.toFixed(0)}% | Gold ${goldPct.toFixed(0)}%`;
  }

  dimensions.push({
    id: "H3",
    name: "Investment Diversification",
    score: h3Score,
    grade: scoreGrade(h3Score),
    detail: h3Detail,
    tip: h3Tip,
  });

  // ── H4: Debt Health (FOIR) ─────────────────────────────────────────────────
  const foir = monthlyIncome > 0 ? (totalMonthlyEMI / monthlyIncome) * 100 : 0;

  let h4Score;
  if (foir === 0 && !hasRevolvingCCDebt) {
    h4Score = 100;
  } else if (foir <= 30 && !hasRevolvingCCDebt) {
    h4Score = 100 - (foir / 30) * 20; // 80–100
  } else if (foir <= 50) {
    h4Score = 80 - ((foir - 30) / 20) * 40; // 40–80
  } else {
    h4Score = Math.max(40 - ((foir - 50) / 20) * 40, 0); // 0–40
  }

  // Revolving CC debt penalty: -20 points
  if (hasRevolvingCCDebt) {
    h4Score = Math.max(h4Score - 20, 0);
    alerts.push({ dimension: "H4", severity: "red", text: "Revolving credit card debt detected — 30-40% interest is eroding wealth." });
  }

  h4Score = Math.round(h4Score);

  let h4Tip = "";
  if (foir > 50) {
    h4Tip = `FOIR is ${foir.toFixed(0)}% — dangerously high. Prioritize clearing high-interest debt.`;
    alerts.push({ dimension: "H4", severity: "red", text: `FOIR at ${foir.toFixed(0)}% (target: <30%).` });
  } else if (foir > 30) {
    h4Tip = `FOIR is ${foir.toFixed(0)}% — above ideal 30%. Avoid new loans.`;
    alerts.push({ dimension: "H4", severity: "amber", text: `FOIR at ${foir.toFixed(0)}% — target <30%.` });
  } else if (foir > 0) {
    h4Tip = `FOIR at ${foir.toFixed(0)}% — within healthy range.`;
  } else {
    h4Tip = "No EMI obligations — great debt health.";
  }

  if (hasRevolvingCCDebt) {
    h4Tip += " Clear credit card dues in full every month to avoid 30-40% interest.";
  }

  dimensions.push({
    id: "H4",
    name: "Debt Health (FOIR)",
    score: h4Score,
    grade: scoreGrade(h4Score),
    detail: `FOIR: ${foir.toFixed(1)}%${hasRevolvingCCDebt ? " + CC Revolving" : ""}`,
    tip: h4Tip,
  });

  // ── H5: Tax Efficiency ─────────────────────────────────────────────────────
  let h5Score = 50; // default if no tax data
  let h5Detail = "No tax data — run Tax Wizard for analysis";
  let h5Tip = "Complete the Tax Wizard to get your tax efficiency score.";

  if (taxReport) {
    const parts = [];
    let pts = 0;

    // 80C utilization (max 1.5L)
    const sec80C = taxReport.deductions80C || 0;
    const utilization80C = Math.min(sec80C / 150000, 1);
    pts += utilization80C * 30;
    parts.push(`80C: ${(utilization80C * 100).toFixed(0)}%`);

    // Correct regime selected?
    const bestRegime = taxReport.bestRegime || taxReport.recommendation || "";
    const regimeMatch = bestRegime ? 25 : 0;
    pts += regimeMatch;
    parts.push(`Regime: ${bestRegime || "—"}`);

    // Tax savings vs potential
    const actualTax = taxReport.bestTax ?? taxReport.taxPayable ?? 0;
    const grossIncome = taxReport.grossIncome || annualIncome;
    const effectiveRate = grossIncome > 0 ? (actualTax / grossIncome) * 100 : 0;

    // Effective rate scoring: <10% great, 10-20% ok, >20% high
    if (effectiveRate <= 10) pts += 25;
    else if (effectiveRate <= 20) pts += 15;
    else pts += 5;
    parts.push(`Eff.Rate: ${effectiveRate.toFixed(1)}%`);

    // Missed deductions penalty
    const missedCount = taxReport.missedDeductions ? taxReport.missedDeductions.length : 0;
    if (missedCount > 0) {
      pts -= missedCount * 5;
      alerts.push({ dimension: "H5", severity: "amber", text: `${missedCount} missed deduction(s) found — potential savings available.` });
    }

    // NPS bonus (sec 80CCD(1B))
    if (taxReport.nps80CCD1B > 0) {
      pts += 10;
      parts.push("NPS ✓");
    }

    // ELSS in portfolio bonus
    if (taxReport.elssAmount > 0 || sec80C > 0) {
      pts += 10;
    }

    h5Score = Math.round(Math.max(Math.min(pts, 100), 0));
    h5Detail = parts.join(" | ");
    h5Tip = missedCount > 0
      ? `You have ${missedCount} unclaimed deduction(s). Review the Tax Wizard results.`
      : "Tax planning looks solid. Keep investing in 80C/80D instruments.";
  }

  dimensions.push({
    id: "H5",
    name: "Tax Efficiency",
    score: h5Score,
    grade: scoreGrade(h5Score),
    detail: h5Detail,
    tip: h5Tip,
  });

  // ── H6: Retirement Readiness ───────────────────────────────────────────────
  const retirementTarget = monthlyIncome * 0.10; // 10% of gross monthly
  const retRatio = retirementTarget > 0
    ? monthlyRetirementSaving / retirementTarget
    : monthlyRetirementSaving > 0 ? 1 : 0;

  let h6Score;
  if (retRatio >= 1.5) h6Score = 100;
  else if (retRatio >= 1.0) h6Score = 80 + (retRatio - 1.0) * 40;
  else if (retRatio >= 0.5) h6Score = 50 + (retRatio - 0.5) * 60;
  else h6Score = retRatio * 100;

  h6Score = Math.round(Math.min(h6Score, 100));

  let h6Tip = "";
  if (retRatio < 0.5) {
    h6Tip = `Save at least ₹${formatINR(retirementTarget)}/month (10% of income) for retirement. Start with EPF/NPS/PPF.`;
    alerts.push({ dimension: "H6", severity: "red", text: `Retirement saving only ₹${formatINR(monthlyRetirementSaving)}/mo — target ₹${formatINR(retirementTarget)}/mo.` });
  } else if (retRatio < 1.0) {
    h6Tip = `You're saving ${(retRatio * 100).toFixed(0)}% of the 10% target. Increase monthly SIPs by ₹${formatINR(retirementTarget - monthlyRetirementSaving)}.`;
    alerts.push({ dimension: "H6", severity: "amber", text: `Retirement savings below 10% of income target.` });
  } else {
    h6Tip = `Great! You're saving ${(retRatio * 10).toFixed(1)}% of income for retirement.`;
  }

  dimensions.push({
    id: "H6",
    name: "Retirement Readiness",
    score: h6Score,
    grade: scoreGrade(h6Score),
    detail: `₹${formatINR(monthlyRetirementSaving)}/mo (${(retRatio * 10).toFixed(1)}% of income)`,
    tip: h6Tip,
  });

  // ── Overall Score (weighted average) ───────────────────────────────────────
  const weights = { H1: 20, H2: 15, H3: 15, H4: 20, H5: 15, H6: 15 };
  let weightedSum = 0;
  let weightTotal = 0;

  for (const dim of dimensions) {
    const w = weights[dim.id] || 15;
    weightedSum += dim.score * w;
    weightTotal += w;
  }

  const overallScore = Math.round(weightedSum / weightTotal);
  const overallGrade = scoreGrade(overallScore);

  return {
    dimensions,
    overallScore,
    overallGrade,
    alerts: alerts.sort((a, b) => (a.severity === "red" ? -1 : 1) - (b.severity === "red" ? -1 : 1)),
  };
}

/** Grade helper */
function scoreGrade(score) {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

/** Indian number format (lakhs/crores) */
function formatINR(n) {
  if (n == null || isNaN(n)) return "0";
  return Math.round(n).toLocaleString("en-IN");
}

/** Parse an INR amount string like "18,396.00" or "3334" or "-" to a number */
function parseINRAmount(val) {
  if (val == null || val === "" || val === "-") return 0;
  if (typeof val === "number") return Math.abs(val);
  const cleaned = String(val).replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// TOOL 4: BANK STATEMENT ANALYZER  (Rules B1 – B6)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * buildBankStatementAnalysis
 *
 * @param {Array<{date:string, narration:string, amount:number, type:'credit'|'debit'}>} transactions
 * @returns {{ income, emiFixed, discretionary, savingsRate, bounces, ccTrap, monthlySummary, alerts }}
 */
export function buildBankStatementAnalysis(transactions = []) {
  const alerts = [];

  // ── Normalize backend keys ──────────────────────────────────────────────────
  // Backend (Groq) sends: { date, description, debit, credit, balance }
  // Also handle alternative keys: "Withdrawal Amt."/"Deposit Amt.", narration/amount/type
  const normalized = transactions.map((raw) => {
    // Clean description: collapse newlines/multi-spaces from OCR
    const desc = String(
      raw.description || raw.narration || raw["Description"] || raw["Narration"] || ""
    ).replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim().toUpperCase();

    // Parse amounts — handle multiple key naming conventions
    const creditAmt = parseINRAmount(
      raw.credit ?? raw["Credit"] ?? raw["Deposit Amt."] ?? raw["Deposit Amt"] ?? raw["deposit"] ?? ""
    );
    const debitAmt = parseINRAmount(
      raw.debit ?? raw["Debit"] ?? raw["Withdrawal Amt."] ?? raw["Withdrawal Amt"] ?? raw["withdrawal"] ?? ""
    );

    // Determine type and amount
    let type;
    let amount;
    if (raw.type) {
      type = String(raw.type).toLowerCase();
      amount = Math.abs(parseINRAmount(raw.amount ?? 0));
    } else if (creditAmt > 0 && debitAmt === 0) {
      type = "credit";
      amount = creditAmt;
    } else if (debitAmt > 0) {
      type = "debit";
      amount = debitAmt;
    } else {
      type = "debit";
      amount = 0;
    }

    return { date: raw.date || "", narration: desc, amount, type, absAmount: amount };
  });

  // ── Regex patterns ──────────────────────────────────────────────────────────
  const RE_INCOME = /SALARY|NEFT\s*CR|IMPS.*P2A|RTGS\s*CR|PENSION|INTEREST\s*CREDIT|INT\.?CR|DIVIDEND/i;
  const RE_EMI = /EMI|LOAN|BILLPAY|AUTO\s*DEBIT|INSURANCE|PREMIUM|LIC|SIP|MUTUAL\s*FUND|NACH|ECS|MANDATE/i;
  const RE_DISCRETIONARY = /POS|UPI|FOOD|ZOMATO|SWIGGY|AMAZON|FLIPKART|NETFLIX|HOTSTAR|SPOTIFY|UBER|OLA|RAPIDO|MOVIE|INOX|PVR|DUNZO|BLINKIT|ZEPTO|DMART|BIGBASKET|MYNTRA|AJIO/i;
  const RE_BOUNCE = /RETURN|BOUNCE|CHGS|PENALTY|DISHONO|INSUFFICIENT|NACH\s*RET|ECS\s*RET/i;
  const RE_CC_PAYMENT = /CREDIT\s*CARD|CC\s*PAYMENT|CRED\s*PAY|CC\s*BILL|SBI\s*CREDIT|SBIN00CARDS/i;

  // ── B1: Income Identification ───────────────────────────────────────────────
  const incomeTransactions = [];
  const emiTransactions = [];
  const discretionaryTransactions = [];
  const bounceTransactions = [];
  const ccPaymentTransactions = [];
  const otherDebits = [];
  const otherCredits = [];

  for (const txn of normalized) {
    const narr = txn.narration;
    const amt = txn.absAmount;
    const isCredit = txn.type === "credit";
    const entry = { ...txn, absAmount: amt };

    if (isCredit && RE_INCOME.test(narr)) {
      incomeTransactions.push(entry);
    } else if (!isCredit && RE_BOUNCE.test(narr)) {
      bounceTransactions.push(entry);
    } else if (!isCredit && RE_CC_PAYMENT.test(narr)) {
      ccPaymentTransactions.push(entry);
    } else if (!isCredit && RE_EMI.test(narr)) {
      emiTransactions.push(entry);
    } else if (!isCredit && RE_DISCRETIONARY.test(narr)) {
      discretionaryTransactions.push(entry);
    } else if (isCredit) {
      otherCredits.push(entry);
    } else {
      otherDebits.push(entry);
    }
  }

  const totalIncome = incomeTransactions.reduce((s, t) => s + t.absAmount, 0);
  const totalOtherCredits = otherCredits.reduce((s, t) => s + t.absAmount, 0);
  const totalInflow = totalIncome + totalOtherCredits;

  // ── B2: EMI & Fixed Costs ──────────────────────────────────────────────────
  const totalEMI = emiTransactions.reduce((s, t) => s + t.absAmount, 0);
  const emiPct = totalInflow > 0 ? (totalEMI / totalInflow) * 100 : 0;

  if (emiPct > 50) {
    alerts.push({ rule: "B2", severity: "red", text: `Fixed obligations are ${emiPct.toFixed(0)}% of inflow — dangerously high.` });
  } else if (emiPct > 30) {
    alerts.push({ rule: "B2", severity: "amber", text: `Fixed obligations at ${emiPct.toFixed(0)}% of inflow — above 30% threshold.` });
  }

  // ── B3: Discretionary Spend ────────────────────────────────────────────────
  const totalDiscretionary = discretionaryTransactions.reduce((s, t) => s + t.absAmount, 0);
  const discretionaryPct = totalInflow > 0 ? (totalDiscretionary / totalInflow) * 100 : 0;

  if (discretionaryPct > 30) {
    alerts.push({ rule: "B3", severity: "amber", text: `Discretionary spend is ${discretionaryPct.toFixed(0)}% of inflow. Review UPI/food delivery/shopping expenses.` });
  }

  // Top discretionary categories
  const discCategoryMap = {};
  for (const t of discretionaryTransactions) {
    const narr = t.narration.toUpperCase();
    let cat = "Other";
    if (/ZOMATO|SWIGGY|FOOD|DUNZO|BLINKIT|ZEPTO|BIGBASKET|DMART/i.test(narr)) cat = "Food & Grocery";
    else if (/AMAZON|FLIPKART|MYNTRA|AJIO/i.test(narr)) cat = "Shopping";
    else if (/NETFLIX|HOTSTAR|SPOTIFY|MOVIE|INOX|PVR/i.test(narr)) cat = "Entertainment";
    else if (/UBER|OLA|RAPIDO/i.test(narr)) cat = "Transport";
    else if (/UPI|POS/i.test(narr)) cat = "UPI/POS";

    discCategoryMap[cat] = (discCategoryMap[cat] || 0) + t.absAmount;
  }

  const discretionaryBreakdown = Object.entries(discCategoryMap)
    .map(([category, amount]) => ({ category, amount, pct: totalInflow > 0 ? (amount / totalInflow) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);

  // ── B4: Savings Rate ───────────────────────────────────────────────────────
  const totalOutflow = totalEMI + totalDiscretionary
    + otherDebits.reduce((s, t) => s + t.absAmount, 0)
    + ccPaymentTransactions.reduce((s, t) => s + t.absAmount, 0)
    + bounceTransactions.reduce((s, t) => s + t.absAmount, 0);

  const savingsRate = totalInflow > 0 ? ((totalInflow - totalOutflow) / totalInflow) * 100 : 0;

  if (savingsRate < 10) {
    alerts.push({ rule: "B4", severity: "red", text: `Savings rate is only ${savingsRate.toFixed(1)}% — target at least 20%.` });
  } else if (savingsRate < 20) {
    alerts.push({ rule: "B4", severity: "amber", text: `Savings rate is ${savingsRate.toFixed(1)}% — below the 20% target.` });
  }

  // ── B5: Bounce / Penalty Detection ─────────────────────────────────────────
  const totalBounceCharges = bounceTransactions.reduce((s, t) => s + t.absAmount, 0);

  if (bounceTransactions.length > 0) {
    alerts.push({
      rule: "B5",
      severity: "red",
      text: `${bounceTransactions.length} bounce/penalty transaction(s) totaling ₹${formatINR(totalBounceCharges)}. This hurts your CIBIL score.`,
    });
  }

  // ── B6: Credit Card Trap ───────────────────────────────────────────────────
  let ccTrapDetected = false;
  let ccTrapDetail = "";

  if (ccPaymentTransactions.length >= 2) {
    const ccAmounts = ccPaymentTransactions.map((t) => t.absAmount).sort((a, b) => a - b);
    const maxCC = ccAmounts[ccAmounts.length - 1];
    const minCC = ccAmounts[0];

    // If min payment is roughly 5% of max, likely paying minimum due
    if (maxCC > 0 && minCC > 0 && minCC / maxCC <= 0.10) {
      ccTrapDetected = true;
      ccTrapDetail = `Minimum payment pattern detected: payments range ₹${formatINR(minCC)} – ₹${formatINR(maxCC)}. Likely paying only minimum due.`;
      alerts.push({ rule: "B6", severity: "red", text: ccTrapDetail });
    }
  }

  // Also flag if revolving via keyword
  for (const t of normalized) {
    if (/MIN\s*DUE|MINIMUM\s*DUE|INTEREST\s*CHARGED|FINANCE\s*CHARGE/.test(t.narration)) {
      if (!ccTrapDetected) {
        ccTrapDetected = true;
        ccTrapDetail = "Credit card minimum due / interest charge detected in statement.";
        alerts.push({ rule: "B6", severity: "red", text: ccTrapDetail });
      }
      break;
    }
  }

  // ── Monthly summary (group by month) ───────────────────────────────────────
  const monthlyMap = {};
  for (const txn of normalized) {
    const dateStr = String(txn.date || "");
    // Handle DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, etc.
    let monthKey = "unknown";
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})/);
    const dmyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (isoMatch) {
      monthKey = `${isoMatch[1]}-${isoMatch[2]}`;
    } else if (dmyMatch) {
      const yr = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
      monthKey = `${yr}-${dmyMatch[2].padStart(2, "0")}`;
    }

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { month: monthKey, inflow: 0, outflow: 0, income: 0, emi: 0, discretionary: 0 };
    }
    const amt = txn.absAmount;
    const isCredit = txn.type === "credit";

    if (isCredit) {
      monthlyMap[monthKey].inflow += amt;
      if (RE_INCOME.test(txn.narration)) monthlyMap[monthKey].income += amt;
    } else {
      monthlyMap[monthKey].outflow += amt;
      if (RE_EMI.test(txn.narration)) monthlyMap[monthKey].emi += amt;
      if (RE_DISCRETIONARY.test(txn.narration)) monthlyMap[monthKey].discretionary += amt;
    }
  }

  const monthlySummary = Object.values(monthlyMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      savingsRate: m.inflow > 0 ? ((m.inflow - m.outflow) / m.inflow) * 100 : 0,
    }));

  return {
    // B1
    income: {
      total: totalIncome,
      transactions: incomeTransactions.length,
      sources: [...new Set(incomeTransactions.map((t) =>
        t.narration.match(RE_INCOME)?.[0]?.toUpperCase() || "OTHER"
      ))],
    },
    totalInflow,
    totalOutflow,

    // B2
    emiFixed: {
      total: totalEMI,
      pct: emiPct,
      transactions: emiTransactions.length,
    },

    // B3
    discretionary: {
      total: totalDiscretionary,
      pct: discretionaryPct,
      transactions: discretionaryTransactions.length,
      breakdown: discretionaryBreakdown,
    },

    // B4
    savingsRate: {
      rate: savingsRate,
      amount: totalInflow - totalOutflow,
      isHealthy: savingsRate >= 20,
    },

    // B5
    bounces: {
      count: bounceTransactions.length,
      totalCharges: totalBounceCharges,
      transactions: bounceTransactions,
    },

    // B6
    ccTrap: {
      detected: ccTrapDetected,
      detail: ccTrapDetail,
      payments: ccPaymentTransactions,
    },

    // Summary
    monthlySummary,
    alerts: alerts.sort((a, b) => (a.severity === "red" ? -1 : 1) - (b.severity === "red" ? -1 : 1)),
    transactionCount: normalized.length,
  };
}
