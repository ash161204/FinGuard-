import { Platform } from 'react-native';
import { apiRequest, ApiClientError } from './client';
import type {
  ActionItem,
  CamsReviewData,
  DocumentType,
  FireResponse,
  JobStatusResponse,
  MfAnalysisResponse,
  NormalizedDocumentResponse,
  ReviewedExtractionResponse,
  ReviewStatus,
  ScoreResponse,
  TaxAnalysisResponse,
  UploadAcceptedResponse,
} from '../../types';

export { ApiClientError };

type UploadableAsset = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

type AnalyzeMfOptions = {
  risk_vibe?: string;
  tax_slab?: number;
  expected_return?: number;
  goal_horizon?: 'short' | 'medium' | 'long';
  emergency_fund_state?: 'none' | 'partial' | 'adequate' | 'unknown';
};

type ScorePayload = {
  monthly_income: number;
  monthly_expenses: number;
  health_inputs: Record<string, unknown>;
};

type FirePayload = {
  current_age: number;
  target_retirement_age: number;
  monthly_income: number;
  monthly_expenses: number;
  current_corpus: number;
  monthly_sip: number;
  expected_annual_expense_at_retirement: number;
  return_rate: number;
  inflation: number;
  salary_growth: number;
};

type ManualActionPayload = {
  title: string;
  subtitle: string;
  impact: number;
  priority: 'high' | 'medium' | 'low';
  action: string;
  progress?: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'dismissed' | 'archived';
};

export async function uploadDocument(
  documentType: DocumentType,
  asset: UploadableAsset,
): Promise<UploadAcceptedResponse> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    formData.append('file', blob, asset.name);
  } else {
    formData.append('file', {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? 'application/pdf',
    } as unknown as Blob);
  }

  return apiRequest<UploadAcceptedResponse>(`/api/v1/upload/${documentType}`, {
    method: 'POST',
    body: formData,
  });
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return apiRequest<JobStatusResponse>(`/api/v1/job/${jobId}`);
}

export async function getLatestExtraction(
  documentType: DocumentType,
): Promise<ReviewedExtractionResponse | null> {
  try {
    return await apiRequest<ReviewedExtractionResponse>(`/api/v1/extractions/${documentType}/latest`);
  } catch (error) {
    if (error instanceof ApiClientError && error.code === 'document_not_found') {
      return null;
    }
    throw error;
  }
}

export async function saveReviewedExtraction(
  documentType: DocumentType,
  reviewedData: ReviewedExtractionResponse['reviewed_data'],
  reviewStatus: ReviewStatus,
): Promise<ReviewedExtractionResponse> {
  return apiRequest<ReviewedExtractionResponse>(`/api/v1/extractions/${documentType}/review`, {
    method: 'PUT',
    body: JSON.stringify({
      reviewed_data: reviewedData,
      review_status: reviewStatus,
    }),
  });
}

export async function normalizeDocument(
  documentType: DocumentType,
): Promise<NormalizedDocumentResponse> {
  return apiRequest<NormalizedDocumentResponse>(`/api/v1/extractions/${documentType}/normalize`, {
    method: 'POST',
  });
}

export async function analyzeTax(): Promise<TaxAnalysisResponse> {
  return apiRequest<TaxAnalysisResponse>('/api/v1/analyze/tax', {
    method: 'POST',
  });
}

export async function analyzeMf(options?: AnalyzeMfOptions): Promise<MfAnalysisResponse> {
  return apiRequest<MfAnalysisResponse>('/api/v1/analyze/mf', {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  });
}

export async function scoreUser(payload: ScorePayload): Promise<ScoreResponse> {
  return apiRequest<ScoreResponse>('/api/v1/score', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function runFirePlan(payload: FirePayload): Promise<FireResponse> {
  return apiRequest<FireResponse>('/api/v1/fire', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getActions(): Promise<ActionItem[]> {
  return apiRequest<ActionItem[]>('/api/v1/actions');
}

export async function updateAction(
  actionId: string,
  payload: {
    status?: 'pending' | 'in_progress' | 'completed' | 'dismissed' | 'archived';
    progress?: number;
  },
): Promise<ActionItem> {
  return apiRequest<ActionItem>(`/api/v1/actions/${actionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function createManualAction(payload: ManualActionPayload): Promise<ActionItem> {
  return apiRequest<ActionItem>('/api/v1/actions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function buildEmptyCamsReview(): CamsReviewData {
  return {
    holdings: [
      {
        fund_name: '',
        category: '',
        invested: null,
        current: null,
        purchase_date: '',
        plan: null,
      },
    ],
  };
}
