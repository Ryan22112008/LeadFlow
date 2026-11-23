import Fastify from 'fastify';
import authRoutes from './modules/auth/auth.routes.ts';

export function buildApp() {
  const app = Fastify();

  app.get('/health', async () => ({ status: 'ok' }));
  app.register(authRoutes);

  return app;
}
