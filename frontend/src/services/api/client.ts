import { apiConfig } from './config';

import type { ApiError } from '../../types';

export class ApiClientError extends Error {
  code: string;
  details?: Record<string, unknown>;
  status: number;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
    this.status = status;
  }
}

function normalizeApiError(status: number, body: unknown): ApiClientError {
  const candidate = body as { detail?: ApiError; error?: ApiError } | null;
  const error =
    candidate?.detail
    ?? candidate?.error
    ?? {
      code: 'request_failed',
      message: `API request failed with status ${status}`,
    };
  return new ApiClientError(status, error);
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    headers:
      init?.body instanceof FormData
        ? init?.headers
        : {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
          },
    ...init,
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw normalizeApiError(response.status, body);
  }

  return (await response.json()) as T;
}
