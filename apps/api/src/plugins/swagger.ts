import type { FastifyInstance } from 'fastify';

import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';

async function registerSwagger(app: FastifyInstance) {
    await app.register(swagger, {
        openapi: {
            openapi: '3.0.3',
            info: {
                title: 'LeadFlow API',
                description:
                    'API do sistema LeadFlow para gestão e acompanhamento de oportunidades comerciais.',
                version: '1.0.0',
            },
            servers: [
                {
                    url: 'http://127.0.0.1:3333',
                    description: 'Ambiente local de desenvolvimento',
                },
            ],
            tags: [
                {
                    name: 'Health',
                    description: 'Verificação de disponibilidade da API',
                },
                {
                    name: 'Authentication',
                    description: 'Autenticação e gerenciamento de sessões',
                },
                {
                    name: 'Leads',
                    description: 'Gerenciamento de oportunidades comerciais',
                },
            ],
        },
    });

    await app.register(swaggerUi, {
        routePrefix: '/docs',
    });
}

export default fp(registerSwagger);