
const TER_DATA = {
  "Large Cap": { regular: 1.65, direct: 0.85 },
  "Mid Cap": { regular: 1.85, direct: 0.95 },
  "Small Cap": { regular: 1.9, direct: 1.0 },
  "Flexi Cap": { regular: 1.7, direct: 0.8 },
  Index: { regular: 0.5, direct: 0.12 },
  "Short Duration": { regular: 0.95, direct: 0.4 },
  Hybrid: { regular: 1.75, direct: 0.9 },
  ELSS: { regular: 1.8, direct: 0.85 },
  "Multi Cap": { regular: 1.7, direct: 0.85 },
  Gilt: { regular: 0.8, direct: 0.35 },
  Liquid: { regular: 0.5, direct: 0.15 },
};

const OVERLAP_DATA = {
  "Large Cap": ["Reliance Industries", "HDFC Bank", "Infosys", "ICICI Bank", "TCS", "Bharti Airtel", "Larsen & Toubro", "ITC", "Axis Bank", "Kotak Bank"],
  "Mid Cap": ["Bharat Electronics", "Persistent Systems", "Zydus Life", "Voltas", "Cummins India", "Apollo Tyres", "Max Healthcare", "Coforge", "Sundaram Finance", "Thermax"],
  "Small Cap": ["Techno Electric", "Garware Technical", "Elecon Engineering", "HLE Glascoat", "Nuvoco Vistas", "Shyam Metalics", "Craftsman Auto", "Safari Industries", "Praj Industries", "Ami Organics"],
  "Flexi Cap": ["Reliance Industries", "HDFC Bank", "Infosys", "ICICI Bank", "Persistent Systems", "Axis Bank", "Bajaj Finance", "Maruti Suzuki", "TCS", "Dr. Reddy"],
  Index: ["Reliance Industries", "HDFC Bank", "Infosys", "ICICI Bank", "TCS", "Bharti Airtel", "Larsen & Toubro", "ITC", "Axis Bank", "Kotak Bank"],
  ELSS: ["Reliance Industries", "HDFC Bank", "ICICI Bank", "Infosys", "Axis Bank", "Maruti Suzuki", "SBI", "L&T", "Bajaj Finance", "HUL"],
  Hybrid: ["Reliance Industries", "HDFC Bank", "ICICI Bank", "Infosys", "TCS", "Bharti Airtel", "Kotak Bank", "ITC", "Axis Bank", "Larsen & Toubro"],
};

const BENCHMARKS = {
  "Large Cap": { name: "Nifty 100 TRI", returns3yr: 0.14 },
  "Mid Cap": { name: "Nifty Midcap 150 TRI", returns3yr: 0.22 },
  "Small Cap": { name: "Nifty Smallcap 250 TRI", returns3yr: 0.24 },
  "Flexi Cap": { name: "Nifty 500 TRI", returns3yr: 0.18 },
  Index: { name: "Nifty 50 TRI", returns3yr: 0.13 },
  ELSS: { name: "Nifty 500 TRI", returns3yr: 0.18 },
  Hybrid: { name: "CRISIL Hybrid 35+65", returns3yr: 0.12 },
  "Short Duration": { name: "CRISIL Short Duration", returns3yr: 0.072 },
};

const DATE_AFTER_APRIL_2023 = new Date("2023-04-01");

const normalizeKey = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseMoney = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.replace(/,/g, "").replace(/[^0-9.-]/g, "").trim();
  if (!cleaned) {
    return undefined;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseText = (value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const parseDate = (value) => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const walkNode = (node, visitor) => {
  if (Array.isArray(node)) {
    node.forEach((item) => walkNode(item, visitor));
    return;
  }

  if (!isObject(node)) {
    return;
  }

  Object.entries(node).forEach(([key, value]) => {
    visitor(key, value, node);
    walkNode(value, visitor);
  });
};

const getValuesByKeys = (root, keys) => {
  const wanted = new Set(keys.map(normalizeKey));
  const matches = [];

  walkNode(root, (key, value) => {
    if (wanted.has(normalizeKey(key))) {
      matches.push(value);
    }
  });

  return matches;
};

const getFirstNumber = (root, keys) => {
  const values = getValuesByKeys(root, keys);
  for (const value of values) {
    const parsed = parseMoney(value);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
};

const getFirstString = (root, keys) => {
  const values = getValuesByKeys(root, keys);
  for (const value of values) {
    const parsed = parseText(value);
    if (parsed) {
      return parsed;
    }
  }
  return undefined;
};

const getFirstAcrossDocuments = (documents, getter) => {
  for (const document of documents) {
    const value = getter(document);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
};

export const unwrapAnalysis = (document) => document?.analysis || document?.output || document?.data || document || {};

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
  if (source.includes("debt") || source.includes("short duration")) return "Short Duration";
  if (source.includes("hybrid") || source.includes("balanced")) return "Hybrid";
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
const computeXIRR = (invested, current, years) => {
  if (!invested || !current || years <= 0) return 0;
  return Math.pow(current / invested, 1 / years) - 1;
};

const mapHolding = (item) => {
  if (!isObject(item)) {
    return null;
  }

  const name = getFirstString(item, [
    "fund_name",
    "scheme_name",
    "scheme",
    "fund",
    "name",
    "security_name",
    "description",
    "scheme_description",
  ]);
  const invested = getFirstNumber(item, [
    "invested_amount",
    "amount_invested",
    "invested",
    "cost",
    "cost_value",
    "purchase_amount",
    "book_value",
    "principal",
    "total_investment",
    "amount",
  ]);
  let current = getFirstNumber(item, [
    "current_value",
    "market_value",
    "current",
    "value",
    "current_market_value",
    "valuation",
    "current_worth",
    "present_value",
  ]);
  const units = getFirstNumber(item, ["units", "unit_balance", "balance_units", "closing_units"]);
  const nav = getFirstNumber(item, ["nav", "current_nav", "nav_per_unit"]);

  if (current === undefined && units !== undefined && nav !== undefined) {
    current = units * nav;
  }

  if (!name || invested === undefined || current === undefined) {
    return null;
  }

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
  if (value.includes("safe")) return "conservative";
  if (value.includes("yolo") || value.includes("aggressive")) return "aggressive";
  return "moderate";
};

const getTargetAllocation = (profile) => ({
  conservative: { equity: 0.3, debt: 0.6, gold: 0.1 },
  moderate: { equity: 0.6, debt: 0.3, gold: 0.1 },
  aggressive: { equity: 0.8, debt: 0.15, gold: 0.05 },
}[profile] || { equity: 0.6, debt: 0.3, gold: 0.1 });
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

export function buildTaxWizardReport(documentResults = []) {
  const inputs = extractTaxInputs(documentResults);
  if (!inputs.available) {
    return { available: false, message: "No salary or tax-style fields were detected in the uploaded JSON yet." };
  }

  const raw80C = inputs.epf + inputs.ppf + inputs.elss + inputs.lifeInsurance + inputs.homeLoanPrincipal + inputs.tuition + inputs.nsc;
  const d80C = Math.min(raw80C, 150000);
  const npsEmp = Math.min(inputs.npsEmployee, 0.1 * (inputs.basic + inputs.da));
  const nps1b = Math.min(inputs.nps1b, 50000);
  const employerNPSCap = Math.min(inputs.employerNPS, 0.14 * (inputs.basic + inputs.da));
  const hraMetro = inputs.cityType === "metro" ? 0.5 * (inputs.basic + inputs.da) : 0.4 * (inputs.basic + inputs.da);
  const hraExempt = Math.max(0, Math.min(inputs.hraReceived, inputs.rentPaid - 0.1 * (inputs.basic + inputs.da), hraMetro));
  const ltaExempt = Math.min(inputs.lta, inputs.ltaActual);
  const gratuityExempt = Math.min(inputs.gratuity, 2000000);
  const hdSelf = Math.min(inputs.healthSelf + inputs.preventive, 25000);
  const hdParents = inputs.parentSenior ? Math.min(inputs.healthParents, 50000) : Math.min(inputs.healthParents, 25000);
  const d80D = hdSelf + hdParents;
  const d24b = inputs.propType === "sop" ? Math.min(inputs.homeLoanInterest, 200000) : inputs.homeLoanInterest;
  const isSenior = inputs.ageCategory !== "below60";
  const d80TTA = isSenior ? 0 : Math.min(inputs.sbInterest, 10000);
  const d80TTB = isSenior ? Math.min(inputs.sbInterest + inputs.fdInterest, 50000) : 0;
  const ltcgAboveThresh = Math.max(0, inputs.ltcgEquity - 125000);
  const hasSalaryBreakup = [inputs.basic, inputs.da, inputs.hraReceived, inputs.specialAllowances, inputs.lta, inputs.otherAllowances, inputs.perquisites, inputs.gratuity, inputs.employerNPS].some((value) => value > 0);
  const grossSalary = hasSalaryBreakup ? inputs.basic + inputs.da + inputs.hraReceived + inputs.specialAllowances + inputs.lta + inputs.otherAllowances + inputs.perquisites + inputs.gratuity + inputs.employerNPS : inputs.grossSalaryReported || inputs.totalIncome;
  const allDeductions = d80C + npsEmp + nps1b + d80D + inputs.educationLoan + d24b + d80TTA + d80TTB + inputs.donations + inputs.otherDeductions;
  const taxableSalaryOld = Math.max(0, grossSalary - hraExempt - ltaExempt - gratuityExempt - 50000 - inputs.professionalTax - employerNPSCap - allDeductions);
  const otherIncomeOld = inputs.fdInterest + Math.max(0, inputs.sbInterest - d80TTA) + inputs.dividend + inputs.debtMFNew;
  const netTaxableOld = taxableSalaryOld + otherIncomeOld + inputs.debtMFOld + inputs.otherCapitalGains;
  const oldSlabs = (income, ageCategory) => {
    let tax = 0;
    const slabs = [[250000, 500000, 0.05], [500000, 1000000, 0.2], [1000000, Number.POSITIVE_INFINITY, 0.3]];
    if (ageCategory === "60to80") slabs[0] = [300000, 500000, 0.05];
    if (ageCategory === "above80") slabs[0] = [500000, 1000000, 0.2];
    slabs.forEach(([low, high, rate]) => { if (income > low) tax += (Math.min(income, high) - low) * rate; });
    return tax;
  };
  const slabTaxOld = oldSlabs(netTaxableOld, inputs.ageCategory);
  const specialTaxOld = inputs.stcgEquity * 0.2 + ltcgAboveThresh * 0.125 + (inputs.debtOldLong ? inputs.debtMFOld * 0.125 : 0);
  let taxOld = slabTaxOld + specialTaxOld;
  const rebate87AOld = netTaxableOld <= 500000 ? Math.min(taxOld, 12500) : 0;
  taxOld -= rebate87AOld;
  const cessOld = taxOld * 0.04;
  const totalTaxOld = Math.max(0, taxOld + cessOld);
  const taxableSalaryNew = Math.max(0, grossSalary - inputs.hraReceived - 75000 - inputs.professionalTax - employerNPSCap - gratuityExempt);
  const netTaxableNew = taxableSalaryNew + inputs.fdInterest + inputs.sbInterest + inputs.dividend + inputs.debtMFNew + inputs.debtMFOld + inputs.otherCapitalGains;
  const newSlabs = (income) => {
    if (income <= 400000) return 0;
    let tax = 0;
    [[400000, 800000, 0.05], [800000, 1200000, 0.1], [1200000, 1600000, 0.15], [1600000, 2000000, 0.2], [2000000, 2400000, 0.25], [2400000, Number.POSITIVE_INFINITY, 0.3]].forEach(([low, high, rate]) => { if (income > low) tax += (Math.min(income, high) - low) * rate; });
    return tax;
  };
  const slabTaxNew = newSlabs(netTaxableNew);
  const specialTaxNew = inputs.stcgEquity * 0.2 + ltcgAboveThresh * 0.125;
  let taxNew = slabTaxNew + specialTaxNew;
  const rebate87ANew = netTaxableNew <= 1200000 ? Math.min(slabTaxNew, 60000) : 0;
  taxNew -= rebate87ANew;
  const cessNew = taxNew * 0.04;
  const totalTaxNew = Math.max(0, taxNew + cessNew);
  const saving = Math.abs(totalTaxOld - totalTaxNew);
  const recommendedRegime = totalTaxNew <= totalTaxOld ? "New" : "Old";
  const missedItems = [];
  if (nps1b < 50000) missedItems.push({ name: "80CCD(1B) Extra NPS", section: "80CCD(1B)", saving: (50000 - nps1b) * 0.3, description: "Additional NPS room is still available." });
  if (raw80C < 150000) missedItems.push({ name: "80C Gap", section: "80C", saving: (150000 - raw80C) * 0.2, description: "ELSS / PPF / NSC room is still unused." });
  if (inputs.healthParents === 0) missedItems.push({ name: "Parents Health Insurance", section: "80D", saving: 25000 * 0.2, description: "Parents cover is not reflected in the extracted JSON." });
  if (inputs.preventive === 0) missedItems.push({ name: "Preventive Health Check", section: "80D", saving: 5000 * 0.2, description: "The common preventive-health deduction is missing." });
  if (inputs.employerNPS === 0) missedItems.push({ name: "Employer NPS", section: "80CCD(2)", saving: 0.14 * inputs.basic * 0.3, description: "Employer NPS is absent, and the source logic flags it heavily." });
  if (inputs.ltcgEquity > 0 && inputs.ltcgEquity < 125000) missedItems.push({ name: "LTCG Harvesting", section: "Capital Gains", saving: inputs.ltcgEquity * 0.125, description: "LTCG sits below the 1.25L threshold." });
  const investments = [
    { name: "NPS Tier 1 - Extra 80CCD(1B)", section: "80CCD(1B)", saving: Math.max(0, 50000 - nps1b) * 0.3, priority: "P1", risk: "Medium" },
    { name: "ELSS Mutual Fund", section: "80C", saving: Math.max(0, 150000 - raw80C) * 0.3, priority: "P1", risk: "High" },
    { name: "PPF Contribution", section: "80C", saving: Math.max(0, 150000 - raw80C) * 0.2, priority: "P2", risk: "Low" },
    { name: "Health Insurance Top-Up", section: "80D", saving: Math.max(0, 25000 - hdSelf) * 0.2, priority: "P2", risk: "Low" },
  ].filter((item) => item.saving > 0);

  return {
    available: true,
    identity: inputs.identity,
    assumptions: inputs.assumptions,
    warnings: (inputs.stcgEquity + inputs.ltcgEquity > 0) && netTaxableNew <= 1200000 ? ["87A rebate on special-rate capital gains may be disputed by CPC; verify with a CA before filing."] : [],
    recommendedRegime,
    saving,
    taxDeducted: inputs.taxDeducted,
    refundOrPayable: inputs.taxDeducted ? inputs.taxDeducted - (recommendedRegime === "New" ? totalTaxNew : totalTaxOld) : 0,
    oldRegime: { totalTax: totalTaxOld, grossSalary, netTaxable: netTaxableOld, slabTax: slabTaxOld, specialTax: specialTaxOld, rebate: rebate87AOld, cess: cessOld },
    newRegime: { totalTax: totalTaxNew, grossSalary, netTaxable: netTaxableNew, slabTax: slabTaxNew, specialTax: specialTaxNew, rebate: rebate87ANew, cess: cessNew },
    missedItems: missedItems.slice(0, 6),
    investments: investments.slice(0, 5),
  };
}
export function buildMfXRayReport(documentResults = [], options = {}) {
  const documents = documentResults.map(unwrapAnalysis);
  const holdings = collectHoldings(documents).map((holding) => ({
    ...holding,
    years: Math.max((Date.now() - holding.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365), 0.1),
  }));

  if (!holdings.length) {
    return { available: false, message: "No mutual-fund holding rows were detected in the uploaded JSON yet. Re-analyze the MF statement so the backend can return a holdings array for TOOL 2." };
  }

  const riskProfile = mapRiskProfile(options.riskVibe);
  const target = getTargetAllocation(riskProfile);
  const totalInvested = holdings.reduce((sum, holding) => sum + holding.invested, 0);
  const totalCurrent = holdings.reduce((sum, holding) => sum + holding.current, 0);
  const totalGain = totalCurrent - totalInvested;
  const totalAbsReturn = totalInvested ? (totalGain / totalInvested) * 100 : 0;
  const equityFunds = holdings.filter((holding) => isEquity(holding.category));
  const debtFunds = holdings.filter((holding) => isDebt(holding.category));
  const equityValue = equityFunds.reduce((sum, holding) => sum + holding.current, 0);
  const debtValue = debtFunds.reduce((sum, holding) => sum + holding.current, 0);
  const equityPct = totalCurrent ? equityValue / totalCurrent : 0;
  const debtPct = totalCurrent ? debtValue / totalCurrent : 0;
  const avgXIRR = totalCurrent ? holdings.reduce((sum, holding) => sum + computeXIRR(holding.invested, holding.current, holding.years) * (holding.current / totalCurrent), 0) : 0;
  const regularFunds = holdings.filter((holding) => holding.isRegular);
  const debtPostApr23 = debtFunds.filter((holding) => holding.purchaseDate >= DATE_AFTER_APRIL_2023);

  const alerts = [];
  if (debtPostApr23.length) {
    alerts.push(`Debt fund tax trap: ${debtPostApr23.map((holding) => holding.name).join(", ")} were purchased after Apr 1, 2023, so gains use slab-rate switch logic.`);
  }
  if (regularFunds.length) {
    alerts.push(`${regularFunds.length} regular plan${regularFunds.length > 1 ? "s" : ""} detected. The HTML tool logic marks TER drag and switch analysis as meaningful here.`);
  }
  if (!holdings.some((holding) => ["Liquid", "Short Duration", "Gilt"].includes(holding.category))) {
    alerts.push("No liquid or debt-style buffer was detected in the parsed holdings, so liquidity may be weak.");
  }

  const overlaps = [];
  const equityOnly = holdings.filter((holding) => isEquity(holding.category) && holding.category !== "Hybrid");
  for (let index = 0; index < equityOnly.length; index += 1) {
    for (let inner = index + 1; inner < equityOnly.length; inner += 1) {
      const overlap = getOverlapPct(equityOnly[index].category, equityOnly[inner].category);
      overlaps.push({
        left: equityOnly[index].name,
        right: equityOnly[inner].name,
        overlap,
        severity: overlap > 50 ? "High" : overlap > 30 ? "Moderate" : "Low",
      });
    }
  }
  overlaps.sort((left, right) => right.overlap - left.overlap);

  const terRows = holdings.map((holding) => {
    const ter = TER_DATA[holding.category] || { regular: 1.5, direct: 0.7 };
    const actualTER = holding.isRegular ? ter.regular : ter.direct;
    const annualDrag = holding.current * (actualTER / 100);
    const annualDirectGap = holding.isRegular ? holding.current * ((ter.regular - ter.direct) / 100) : 0;
    const tenYearDrag = holding.current * (Math.pow(1 + 0.12, 10) - Math.pow(1 + 0.12 - actualTER / 100, 10));
    const expensive = (isEquity(holding.category) && actualTER > 2) || (isDebt(holding.category) && actualTER > 1) || (holding.category === "Index" && actualTER > 0.5);
    return {
      name: holding.name,
      category: holding.category,
      ter: actualTER,
      annualDrag,
      annualDirectGap,
      tenYearDrag,
      flag: expensive ? "Expensive" : actualTER > 1.5 ? "Review" : "OK",
    };
  });

  const benchmarkRows = holdings.filter((holding) => BENCHMARKS[holding.category]).map((holding) => {
    const fundXIRR = computeXIRR(holding.invested, holding.current, holding.years);
    const benchmark = BENCHMARKS[holding.category];
    const alpha = fundXIRR - benchmark.returns3yr;
    return {
      name: holding.name,
      category: holding.category,
      benchmark: benchmark.name,
      fundXIRR,
      benchmarkXIRR: benchmark.returns3yr,
      alpha,
      status: alpha >= 0.02 ? "Outperformer" : alpha >= 0 ? "Marginal" : "Underperformer",
    };
  });

  const actions = [];
  if (Math.abs(equityPct - target.equity) > 0.1) {
    actions.push({
      title: `Rebalance equity allocation by ${Math.round(Math.abs(equityPct - target.equity) * 100)}%`,
      impact: Math.abs(equityValue - target.equity * totalCurrent),
      when: "This Month",
      description: `Current equity is ${Math.round(equityPct * 100)}% vs target ${Math.round(target.equity * 100)}% for a ${riskProfile} profile.`,
    });
  }

  regularFunds.forEach((holding) => {
    const ter = TER_DATA[holding.category] || { regular: 1.5, direct: 0.7 };
    const annualSaving = holding.current * ((ter.regular - ter.direct) / 100);
    const gain = holding.current - holding.invested;
    const taxCost = isDebt(holding.category) && holding.purchaseDate >= DATE_AFTER_APRIL_2023 ? gain * 0.3 : gain * (holding.years > 1 ? 0.125 : 0.2);
    const paybackYears = annualSaving > 0 ? taxCost / annualSaving : Infinity;
    actions.push({
      title: `Review Regular to Direct switch: ${holding.name}`,
      impact: annualSaving,
      when: paybackYears < 2 ? "Do Now" : "This Month",
      description: `Estimated payback period: ${Number.isFinite(paybackYears) ? paybackYears.toFixed(1) : "8"} years using the tool TER and switch logic.`,
    });
  });

  const hasGold = holdings.some((holding) => holding.category === "Gold" || holding.category === "Gold ETF");
  if (!hasGold) {
    actions.push({
      title: "Add Gold ETF allocation",
      impact: totalCurrent * target.gold,
      when: "Annual Review",
      description: `The source logic recommends a ${Math.round(target.gold * 100)}% gold sleeve and none was detected.`,
    });
  }

  const harvestable = equityFunds.filter((holding) => holding.years > 1 && holding.current - holding.invested > 0 && holding.current - holding.invested < 125000);
  if (harvestable.length) {
    const totalHarvest = harvestable.reduce((sum, holding) => sum + (holding.current - holding.invested), 0);
    actions.push({
      title: "Use LTCG harvesting window",
      impact: totalHarvest * 0.125,
      when: "This Month",
      description: `${harvestable.length} equity holding(s) sit below the 1.25L LTCG threshold and may be harvested tax efficiently.`,
    });
  }

  return {
    available: true,
    riskProfile,
    holdingsCount: holdings.length,
    totalInvested,
    totalCurrent,
    totalGain,
    totalAbsReturn,
    avgXIRR,
    regularFundsCount: regularFunds.length,
    equityPct,
    debtPct,
    target,
    alerts,
    holdings: holdings.slice().sort((left, right) => right.current - left.current),
    overlaps: overlaps.slice(0, 6),
    terRows: terRows.slice().sort((left, right) => right.annualDrag - left.annualDrag),
    benchmarkRows,
    actions: actions.slice(0, 8),
  };
}


