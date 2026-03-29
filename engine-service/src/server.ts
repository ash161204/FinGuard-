console.log('--- ENGINE BOOTING ---');

import Fastify from 'fastify';

import { registerEngineRoutes } from './routes/engine.js';
import { registerHealthRoutes } from './routes/health.js';

export function buildServer() {
  const app = Fastify({
    logger: true,
  });

  void registerHealthRoutes(app);
  void registerEngineRoutes(app);

  return app;
}

async function start() {
  const app = buildServer();
  const port = Number(process.env.ENGINE_PORT || 3001);
  const host = process.env.ENGINE_HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

if (import.meta.url) {
  void start();
}
