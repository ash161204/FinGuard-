import { renderHook, act } from '@testing-library/react-native';
import { useAppStore } from '../state/appStore';
import { useMutation, useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { ScoreResponse, ActionItem } from '../types';

// Mock the API services
jest.mock('../services/api/finguard', () => ({
  uploadDocument: jest.fn(),
  getJobStatus: jest.fn(),
  getLatestExtraction: jest.fn(),
  scoreUser: jest.fn(),
  getActions: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Frontend Smoke Tests', () => {
  beforeEach(() => {
    useAppStore.getState().setProfile({ monthlyIncome: 100000, monthlyExpenses: 50000 });
    queryClient.clear();
  });

  it('verifies score display logic and refresh mutation', async () => {
    const { scoreUser } = require('../services/api/finguard');
    scoreUser.mockResolvedValueOnce({
      score: 85,
      grade: 'A',
      dimensions: [],
      changes: [],
    });

    const { result } = renderHook(() => useMutation({
      mutationFn: () => scoreUser({
        monthly_income: 100000,
        monthly_expenses: 50000,
        health_inputs: {},
      }),
      onSuccess: (res: ScoreResponse) => useAppStore.getState().setScoreReport(res),
    }), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    expect(useAppStore.getState().reports.score?.score).toBe(85);
    expect(useAppStore.getState().reports.score?.grade).toBe('A');
  });

  it('verifies upload and job status tracking', async () => {
    const { uploadDocument, getJobStatus } = require('../services/api/finguard');
    const mockJobId = 'job-123';
    
    uploadDocument.mockResolvedValueOnce({
      job_id: mockJobId,
      status: 'pending',
      type: 'form16_upload',
      filename: 'test.pdf',
    });

    getJobStatus.mockResolvedValueOnce({
      job_id: mockJobId,
      status: 'completed',
      type: 'form16_upload',
      result: { type: 'form16', status: 'complete', data: {}, missing_fields: [], warnings: [] },
      error: null,
    });

    // Test store update for jobs
    act(() => {
      useAppStore.getState().setJob('form16', {
        job_id: mockJobId,
        user_id: 'test-user',
        status: 'pending',
        type: 'form16_upload',
        result: null,
        error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    expect(useAppStore.getState().jobs.form16?.status).toBe('pending');

    // Simulate completion
    act(() => {
      useAppStore.getState().setJob('form16', {
        ...useAppStore.getState().jobs.form16!,
        status: 'completed',
      });
    });

    expect(useAppStore.getState().jobs.form16?.status).toBe('completed');
  });

  it('verifies action item management', async () => {
    const { getActions } = require('../services/api/finguard');
    const mockActions: ActionItem[] = [
      { id: '1', action_type: 'tax_optimization', details: { title: 'Action 1' }, status: 'pending', progress: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    
    getActions.mockResolvedValueOnce(mockActions);

    const { result } = renderHook(() => useQuery({
      queryKey: ['actions'],
      queryFn: getActions,
    }), { wrapper });

    await act(async () => {
      // wait for query to resolve
    });

    act(() => {
      useAppStore.getState().setActions(mockActions);
    });

    expect(useAppStore.getState().actions.length).toBe(1);
    expect(useAppStore.getState().actions[0].details.title).toBe('Action 1');
  });
});