import type { AuthenticatedPrincipal } from '../modules/auth/auth.types.js';

declare module 'fastify' {
    interface FastifyRequest {
        user: AuthenticatedPrincipal | null;
    }
}