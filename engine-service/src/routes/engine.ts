import type { FastifyInstance } from 'fastify';

import { runEngineRequestSchema } from '../schemas/engine.js';
import { runEngine } from '../services/engine-runner.js';

export async function registerEngineRoutes(app: FastifyInstance): Promise<void> {
  app.post('/run-engine', async (request, reply) => {
    const parsed = runEngineRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'invalid_request',
          message: 'Request body does not match the run-engine contract.',
          details: parsed.error.flatten(),
        },
      });
    }

    try {
      const result = await runEngine(parsed.data);
      return reply.send({
        mode: parsed.data.mode,
        result,
      });
    } catch (error) {
      return reply.status(501).send({
        error: {
          code: 'not_implemented',
          message: error instanceof Error ? error.message : 'Engine runner is not implemented.',
        },
      });
    }
  });
}
