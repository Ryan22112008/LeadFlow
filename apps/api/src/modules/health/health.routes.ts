import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
    app.get(
        '/health',
        {
            schema: {
                tags: ['Health'],
                summary: 'Verificar disponibilidade da API',
                description: 'Retorna informações sobre o estado atual da API.',
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            application: { type: 'string' },
                            timestamp: { type: 'string' },
                        },
                    },
                },
            },
        },
        async () => {
            return {
                status: 'ok',
                application: 'LeadFlow API',
                timestamp: new Date().toISOString(),
            };
        },
    );
}