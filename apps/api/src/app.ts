import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import authRoutes from './modules/auth/auth.routes.ts';
import { prisma } from './shared/prisma.ts';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(helmet);

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);

  return app;
}
