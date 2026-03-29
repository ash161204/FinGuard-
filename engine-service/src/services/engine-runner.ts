import { z } from 'zod';

import type { RunEngineRequest } from '../schemas/engine.js';
import {
  buildMoneyHealthScore,
  buildMfXRayReport,
  buildTaxWizardReport,
} from '../../../insightEngine.js';

const taxPayloadSchema = z.object({
  documentResults: z.array(z.unknown()).optional(),
  documents: z.array(z.unknown()).optional(),
});

const mfPayloadSchema = z.object({
  documentResults: z.array(z.unknown()).optional(),
  documents: z.array(z.unknown()).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

const scorePayloadSchema = z.object({
  healthInputs: z.record(z.string(), z.unknown()).default({}),
  monthlyIncome: z.coerce.number(),
  monthlyExpenses: z.coerce.number().default(0),
  taxReport: z.record(z.string(), z.unknown()).nullable().optional(),
  mfReport: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function runEngine(request: RunEngineRequest): Promise<unknown> {
  switch (request.mode) {
    case 'tax': {
      const parsed = taxPayloadSchema.parse(request.payload);
      return buildTaxWizardReport(parsed.documentResults ?? parsed.documents ?? []);
    }
    case 'mf': {
      const parsed = mfPayloadSchema.parse(request.payload);
      return buildMfXRayReport(parsed.documentResults ?? parsed.documents ?? [], parsed.options ?? {});
    }
    case 'score': {
      const parsed = scorePayloadSchema.parse(request.payload);
      return buildMoneyHealthScore(
        parsed.healthInputs,
        parsed.monthlyIncome,
        parsed.monthlyExpenses,
        parsed.taxReport ?? undefined,
        parsed.mfReport ?? undefined,
      );
    }
  }
}
