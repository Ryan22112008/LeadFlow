import { buildApp } from './app.ts';

const app = buildApp();

try {
  await app.listen({ port: 3000, host: '0.0.0.0' });
} catch (error: unknown) {
  app.log.error(error, 'Failed to start API server');
  await app.close();
  process.exitCode = 1;
}
