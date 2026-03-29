export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type DocumentType = 'form16' | 'cams';

export type DocumentJobType = 'form16_upload' | 'cams_upload';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ScorePriority = 'high' | 'medium' | 'low';

export type ReviewStatus = 'pending' | 'completed';

export type Form16ReviewData = {
  level_1: {
    salary: number | null;
    hra_received: number | null;
    rent_paid: number | null;
    tax_deducted: number | null;
    deductions: {
      '80C': number | null;
      '80D': number | null;
      '80CCD1B': number | null;
    };
  };
  level_2: {
    lta: number | null;
    bonus: number | null;
    other_allowances: number | null;
    professional_tax: number | null;
  };
  level_3: {
    previous_employer_income: number | null;
    other_income: number | null;
    losses: number | null;
  };
};

export type CamsHolding = {
  fund_name: string | null;
  category: string | null;
  invested: number | null;
  current: number | null;
  purchase_date: string | null;
  plan: 'Direct' | 'Regular' | null;
};

export type CamsReviewData = {
  holdings: CamsHolding[];
};

export type ReviewedDocumentData = Form16ReviewData | CamsReviewData;

export type ValidationSummary = {
  status: 'complete' | 'partial' | 'invalid';
  critical_ready: boolean;
  missing_fields: string[];
  blocking_fields: string[];
};

export type ReviewedExtractionResponse = {
  document_id: string;
  type: DocumentType;
  raw_extracted_data: ReviewedDocumentData;
  reviewed_data: ReviewedDocumentData;
  review_status: ReviewStatus;
  validation: ValidationSummary;
  normalized_data: Record<string, unknown> | null;
  review_metadata: Record<string, unknown>;
  warnings: string[];
  created_at: string;
  reviewed_at: string | null;
};

export type NormalizedDocumentResponse = {
  user_id: string;
  type: DocumentType;
  data: Record<string, unknown>;
  audit: Record<string, unknown>;
  updated_at: string;
};

export type UploadAcceptedResponse = {
  job_id: string;
  status: JobStatus;
  type: DocumentJobType;
  filename: string;
};

export type JobStatusResponse = {
  job_id: string;
  user_id: string;
  type: string;
  status: JobStatus;
  result: Record<string, unknown> | null;
  error: ApiError | null;
  created_at: string;
  updated_at: string;
};

export type InsightCard = {
  title: string;
  subtitle: string;
  impact: number;
  priority: ScorePriority;
  action: string;
};

export type TaxAnalysisResponse = {
  summary: {
    recommended_regime: string;
    tax_payable: number;
    refund_or_payable: number;
  };
  top_insights: InsightCard[];
  full_report: Record<string, unknown>;
};

export type MfAnalysisResponse = {
  summary: {
    portfolio_value: number;
    portfolio_xirr: number;
    risk_profile: string;
  };
  top_insights: InsightCard[];
  full_report: Record<string, unknown>;
};

export type ScoreDimension = {
  id: string;
  name: string;
  score: number;
  grade: string;
  detail: string;
  tip: string;
};

export type ScoreChange = {
  metric: string;
  previous: number;
  current: number;
  delta: number;
};

export type ScoreResponse = {
  score: number;
  grade: string;
  dimensions: ScoreDimension[];
  changes: ScoreChange[];
};

export type FireYearPlan = {
  age: number;
  annual_income: number;
  annual_expenses: number;
  annual_sip: number;
  projected_corpus: number;
  required_corpus: number;
  gap: number;
};

export type FireResponse = {
  retirement_age: number;
  yearly_plan: FireYearPlan[];
  corpus: {
    required: number;
    projected: number;
    gap: number;
  };
};

export type ActionItem = {
  id: string;
  action_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed' | 'archived';
  progress: number;
  details: {
    source?: string;
    source_key?: string;
    title?: string;
    subtitle?: string;
    impact?: number;
    priority?: ScorePriority;
    action?: string;
    rank?: number;
    inferred?: boolean;
  };
  created_at: string;
  updated_at: string;
};

export type ProfileState = {
  monthlyIncome: number;
  monthlyExpenses: number;
};

export type HealthInputs = {
  emergencyFund: number;
  healthInsuranceCover: number;
  termLifeCover: number;
  hasDependents: boolean;
  totalMonthlyEMI: number;
  hasRevolvingCCDebt: boolean;
  monthlyRetirementSaving: number;
};

export type FireInputs = {
  currentAge: number;
  targetRetirementAge: number;
  currentCorpus: number;
  monthlySip: number;
  expectedAnnualExpenseAtRetirement: number;
  returnRate: number;
  inflation: number;
  salaryGrowth: number;
};

export type ScoreHistoryPoint = {
  score: number;
  timestamp: string;
};
