import { describe, expect, it } from 'vitest';

import { runEngine } from '../src/services/engine-runner.js';
import { mfDocumentsFixture, taxDocumentsFixture } from './fixtures.js';

describe('runEngine', () => {
  it('returns canonical tax fields', async () => {
    const result = await runEngine({
      mode: 'tax',
      payload: {
        documentResults: taxDocumentsFixture,
      },
    });

    expect(result).toMatchObject({
      available: true,
      bestRegime: expect.any(String),
      recommendation: expect.any(String),
      bestTax: expect.any(Number),
      taxPayable: expect.any(Number),
      deductions80C: expect.any(Number),
      nps80CCD1B: 50000,
      missedDeductions: expect.any(Array),
    });
  });

  it('returns canonical MF allocation and overlap fields', async () => {
    const result = await runEngine({
      mode: 'mf',
      payload: {
        documentResults: mfDocumentsFixture,
        options: {
          riskVibe: 'moderate',
        },
      },
    });

    expect(result).toMatchObject({
      available: true,
      allocationPct: {
        equity: expect.any(Number),
        debt: expect.any(Number),
        gold: expect.any(Number),
      },
      overlaps: expect.any(Array),
    });

    const mfResult = result as { overlaps: Array<{ similarity: number }> };
    expect(mfResult.overlaps.every((item) => typeof item.similarity === 'number')).toBe(true);
  });

  it('builds score results from monthly income inputs', async () => {
    const taxReport = await runEngine({
      mode: 'tax',
      payload: {
        documentResults: taxDocumentsFixture,
      },
    });
    const mfReport = await runEngine({
      mode: 'mf',
      payload: {
        documentResults: mfDocumentsFixture,
      },
    });
    const scoreResult = await runEngine({
      mode: 'score',
      payload: {
        healthInputs: {
          emergencyFund: 300000,
          healthInsuranceCover: 1000000,
          termLifeCover: 12000000,
          hasDependents: true,
          totalMonthlyEMI: 20000,
          hasRevolvingCCDebt: false,
          monthlyRetirementSaving: 25000,
        },
        monthlyIncome: 150000,
        monthlyExpenses: 70000,
        taxReport,
        mfReport,
      },
    });

    expect(scoreResult).toMatchObject({
      overallScore: expect.any(Number),
      overallGrade: expect.any(String),
      dimensions: expect.any(Array),
      alerts: expect.any(Array),
    });
  });
});
