import { env } from './config/env.ts';
import { buildApp } from './app.ts';

const app = await buildApp();

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  app.log.info(`Received ${signal}. Starting graceful shutdown.`);

  try {
    await app.close();
    app.log.info('Server closed successfully.');
  } catch (error: unknown) {
    app.log.error(error, 'Error during graceful shutdown');
    process.exitCode = 1;
  }
}

// Registra os sinais antes de iniciar o servidor.
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await app.listen({
    port: env.PORT,
    host: env.HOST,
  });
} catch (error: unknown) {
  app.log.error(error, 'Failed to start API server');

  try {
    await app.close();
  } catch (closeError: unknown) {
    app.log.error(closeError, 'Failed to close application after startup error');
  }

  process.exitCode = 1;
}
