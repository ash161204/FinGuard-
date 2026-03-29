import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  ActionItem,
  DocumentType,
  FireInputs,
  FireResponse,
  HealthInputs,
  JobStatusResponse,
  MfAnalysisResponse,
  ProfileState,
  ScoreHistoryPoint,
  ScoreResponse,
  TaxAnalysisResponse,
} from '../types';

type AppState = {
  hasHydrated: boolean;
  onboardingComplete: boolean;
  profile: ProfileState;
  healthInputs: HealthInputs;
  fireInputs: FireInputs;
  reports: {
    tax: TaxAnalysisResponse | null;
    mf: MfAnalysisResponse | null;
    score: ScoreResponse | null;
    fire: FireResponse | null;
  };
  actions: ActionItem[];
  jobs: Partial<Record<DocumentType, JobStatusResponse>>;
  scoreHistory: ScoreHistoryPoint[];
  setHydrated: (value: boolean) => void;
  completeOnboarding: () => void;
  setProfile: (profile: Partial<ProfileState>) => void;
  setHealthInputs: (healthInputs: Partial<HealthInputs>) => void;
  setFireInputs: (fireInputs: Partial<FireInputs>) => void;
  setTaxReport: (report: TaxAnalysisResponse | null) => void;
  setMfReport: (report: MfAnalysisResponse | null) => void;
  setScoreReport: (report: ScoreResponse | null) => void;
  setFireReport: (report: FireResponse | null) => void;
  setActions: (actions: ActionItem[]) => void;
  upsertAction: (action: ActionItem) => void;
  setJob: (documentType: DocumentType, job: JobStatusResponse | null) => void;
  pushScoreHistory: (point: ScoreHistoryPoint) => void;
  clearDerivedForDocument: (documentType: DocumentType) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      onboardingComplete: false,
      profile: {
        monthlyIncome: 0,
        monthlyExpenses: 0,
      },
      healthInputs: {
        emergencyFund: 0,
        healthInsuranceCover: 0,
        termLifeCover: 0,
        hasDependents: false,
        totalMonthlyEMI: 0,
        hasRevolvingCCDebt: false,
        monthlyRetirementSaving: 0,
      },
      fireInputs: {
        currentAge: 30,
        targetRetirementAge: 45,
        currentCorpus: 0,
        monthlySip: 0,
        expectedAnnualExpenseAtRetirement: 0,
        returnRate: 0.12,
        inflation: 0.06,
        salaryGrowth: 0.08,
      },
      reports: {
        tax: null,
        mf: null,
        score: null,
        fire: null,
      },
      actions: [],
      jobs: {},
      scoreHistory: [],
      setHydrated: (value) => set({ hasHydrated: value }),
      completeOnboarding: () => set({ onboardingComplete: true }),
      setProfile: (profile) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...profile,
          },
        })),
      setHealthInputs: (healthInputs) =>
        set((state) => ({
          healthInputs: {
            ...state.healthInputs,
            ...healthInputs,
          },
        })),
      setFireInputs: (fireInputs) =>
        set((state) => ({
          fireInputs: {
            ...state.fireInputs,
            ...fireInputs,
          },
        })),
      setTaxReport: (report) =>
        set((state) => ({
          reports: {
            ...state.reports,
            tax: report,
          },
        })),
      setMfReport: (report) =>
        set((state) => ({
          reports: {
            ...state.reports,
            mf: report,
          },
        })),
      setScoreReport: (report) =>
        set((state) => ({
          reports: {
            ...state.reports,
            score: report,
          },
        })),
      setFireReport: (report) =>
        set((state) => ({
          reports: {
            ...state.reports,
            fire: report,
          },
        })),
      setActions: (actions) => set({ actions }),
      upsertAction: (action) =>
        set((state) => {
          const existing = state.actions.find((item) => item.id === action.id);
          if (!existing) {
            return { actions: [action, ...state.actions] };
          }
          return {
            actions: state.actions.map((item) => (item.id === action.id ? action : item)),
          };
        }),
      setJob: (documentType, job) =>
        set((state) => ({
          jobs: {
            ...state.jobs,
            [documentType]: job ?? undefined,
          },
        })),
      pushScoreHistory: (point) =>
        set((state) => {
          const next = [point, ...state.scoreHistory].slice(0, 12);
          return { scoreHistory: next };
        }),
      clearDerivedForDocument: (documentType) =>
        set((state) => {
          if (documentType === 'form16') {
            return {
              reports: {
                ...state.reports,
                tax: null,
                score: null,
              },
            };
          }
          return {
            reports: {
              ...state.reports,
              mf: null,
              score: null,
            },
          };
        }),
    }),
    {
      name: 'finguard-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        profile: state.profile,
        healthInputs: state.healthInputs,
        fireInputs: state.fireInputs,
        reports: state.reports,
        actions: state.actions,
        jobs: state.jobs,
        scoreHistory: state.scoreHistory,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
