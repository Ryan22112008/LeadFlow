import type { FastifyReply, FastifyRequest } from 'fastify';

import { verifyAccessToken } from './jwt.js';

export async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply,
): Promise<void> {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
        return reply.status(401).send({
            error: {
                code: 'UNAUTHORIZED',
                message: 'Autenticação necessária.',
            },
        });
    }

    const token = authorization.slice(7);

    try {
        const payload = await verifyAccessToken(token);

        request.user = {
            id: payload.sub,
            empresaId: payload.empresaId,
            papel: payload.papel,
        };
    } catch {
        return reply.status(401).send({
            error: {
                code: 'INVALID_TOKEN',
                message: 'Token inválido ou expirado.',
            },
        });
    }
}