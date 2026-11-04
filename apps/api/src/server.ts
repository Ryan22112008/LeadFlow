import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = buildApp();

const start = async (): Promise<void> => {
  try {
    await app.listen({
      port: env.API_PORT,
      host: env.API_HOST,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();