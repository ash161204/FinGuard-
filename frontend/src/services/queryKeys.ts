import type { DocumentType } from '../types';

export const queryKeys = {
  extraction: (documentType: DocumentType) => ['extraction', documentType] as const,
  job: (jobId: string | null) => ['job', jobId] as const,
  actions: ['actions'] as const,
};
