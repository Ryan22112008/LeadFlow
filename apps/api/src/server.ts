import Fastify from 'fastify';

const app = Fastify({
  logger: true,
});

app.get('/health', async () => {
  return {
    status: 'ok',
    application: 'LeadFlow API',
    timestamp: new Date().toISOString(),
  };
});

const start = async (): Promise<void> => {
  try {
    await app.listen({
      port: 3333,
      host: '127.0.0.1',
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();