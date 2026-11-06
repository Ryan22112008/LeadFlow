import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';

import { env } from './config/env.js';
import { AppError } from './errors/app-error.js';
import { healthRoutes } from './modules/health/health.routes.js';
import registerSwagger from './plugins/swagger.js';
import cookie from '@fastify/cookie';   

export function buildApp() {
    const app = Fastify({
        logger: true,
    });

    app.decorateRequest('user', null);
    app.register(helmet);
    app.register(cookie);
    
    app.register(cors, {
        origin: env.WEB_ORIGIN,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    app.setErrorHandler((error, request, reply) => {
        if (error instanceof AppError) {
            return reply.status(error.statusCode).send({
                error: {
                    code: error.code,
                    message: error.message,
                },
            });
        }

        if (error instanceof ZodError) {
            return reply.status(400).send({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Os dados enviados são inválidos.',
                    details: error.issues.map((issue) => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                    })),
                },
            });
        }

        if (
            typeof error === 'object' &&
            error !== null &&
            'validation' in error
        ) {
            return reply.status(400).send({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Os dados enviados são inválidos.',
                },
            });
        }

        request.log.error(error);

        return reply.status(500).send({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Ocorreu um erro interno. Tente novamente mais tarde.',
            },
        });
    });
    app.register(registerSwagger);
    app.register(healthRoutes);

    return app;
}