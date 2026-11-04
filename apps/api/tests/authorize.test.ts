import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify from 'fastify';

import { authorize } from '../src/security/authorize.js';

import type { AuthenticatedPrincipal } from '../src/modules/auth/auth.types.js';

describe('Authorize Middleware', () => {
    const app = Fastify();

    const fakeUser: AuthenticatedPrincipal = {
        id: 'user-123',
        empresaId: 'company-123',
        papel: 'OWNER',
    };

    beforeAll(async () => {
        app.decorateRequest('user', null);

        app.get(
            '/owner-only',
            {
                preHandler: [
                    async (request) => {
                        request.user = fakeUser;
                    },
                    authorize('OWNER'),
                ],
            },
            async () => ({
                message: 'Acesso autorizado.',
            }),
        );

        app.get(
            '/admin-only',
            {
                preHandler: [
                    async (request) => {
                        request.user = {
                            ...fakeUser,
                            papel: 'CORRETOR',
                        };
                    },
                    authorize('ADMIN'),
                ],
            },
            async () => ({
                message: 'Acesso autorizado.',
            }),
        );

        app.get(
            '/unauthenticated',
            {
                preHandler: authorize('OWNER'),
            },
            async () => ({
                message: 'Acesso autorizado.',
            }),
        );

        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('deve permitir acesso ao papel autorizado', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/owner-only',
        });

        expect(response.statusCode).toBe(200);
    });

    it('deve bloquear acesso ao papel não autorizado', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/admin-only',
        });

        expect(response.statusCode).toBe(403);
        expect(response.json().error.code).toBe('FORBIDDEN');
    });

    it('deve rejeitar usuário não autenticado', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/unauthenticated',
        });

        expect(response.statusCode).toBe(401);
        expect(response.json().error.code).toBe('UNAUTHORIZED');
    });
});