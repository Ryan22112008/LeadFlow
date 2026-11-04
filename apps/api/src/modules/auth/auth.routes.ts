import type { FastifyInstance } from 'fastify';

import { registerSchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import type { AuthRepository } from './auth.repository.js';

export function authRoutes(authRepository: AuthRepository) {
    const authService = new AuthService(authRepository);

    return async function (app: FastifyInstance) {
        app.post(
            '/auth/register',
            async (request, reply) => {
                const input = registerSchema.parse(request.body);

                const result = await authService.register(input);

                return reply.status(201).send({
                    message: 'Empresa cadastrada com sucesso.',
                    data: result,
                });
            },
        );
    };
}