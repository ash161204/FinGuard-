import { describe, expect, it } from 'vitest';

import { buildServer } from '../src/server.js';
import { taxDocumentsFixture } from './fixtures.js';

describe('engine-service', () => {
  it('responds on health', async () => {
    const app = buildServer();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'engine-service',
    });

    await app.close();
  });

  it('runs the tax engine over HTTP', async () => {
    const app = buildServer();
    const response = await app.inject({
      method: 'POST',
      url: '/run-engine',
      payload: {
        mode: 'tax',
        payload: {
          documentResults: taxDocumentsFixture,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      mode: 'tax',
      result: {
        available: true,
        bestRegime: expect.any(String),
      },
    });

    await app.close();
  });
});
