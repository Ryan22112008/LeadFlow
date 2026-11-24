import Fastify from 'fastify';
import authRoutes from './modules/auth/auth.routes.ts';
import { prisma } from './shared/prisma.ts';

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.register(authRoutes);

  return app;
}
