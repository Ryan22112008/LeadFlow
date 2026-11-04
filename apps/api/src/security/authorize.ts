import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AuthenticatedPrincipal } from '../modules/auth/auth.types.js';

type UserRole = AuthenticatedPrincipal['papel'];

export function authorize(...allowedRoles: UserRole[]) {
    return async function (
        request: FastifyRequest,
        reply: FastifyReply,
    ): Promise<void> {
        if (!request.user) {
            return reply.status(401).send({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Autenticação necessária.',
                },
            });
        }

        if (!allowedRoles.includes(request.user.papel)) {
            return reply.status(403).send({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Você não tem permissão para realizar esta ação.',
                },
            });
        }
    };
}