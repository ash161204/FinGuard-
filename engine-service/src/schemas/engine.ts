import { z } from 'zod';

export const engineModeSchema = z.enum(['tax', 'mf', 'score']);

export const runEngineRequestSchema = z.object({
  mode: engineModeSchema,
  payload: z.record(z.string(), z.unknown()),
});

export type RunEngineRequest = z.infer<typeof runEngineRequestSchema>;
