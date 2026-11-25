import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';

const app = await buildApp();

afterAll(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('returns HTTP 200', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
  });

  it('returns the expected response body', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.json()).toStrictEqual({ status: 'ok' });
  });
});
