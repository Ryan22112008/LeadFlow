import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authenticate } from '../src/security/authenticate.js';
import { generateAccessToken } from '../src/security/jwt.js';
describe('Authenticate Middleware', () => {
    const app = Fastify();
    const fakeUser = {
        id: 'user-123',
        empresaId: 'company-123',
        nome: 'Ryan',
        email: 'ryan@example.com',
        papel: 'OWNER',
    };
    beforeAll(async () => {
        app.decorateRequest('user', null);
        app.get('/protected', {
            preHandler: authenticate,
        }, async (request) => {
            return {
                user: request.user,
            };
        });
        await app.ready();
    });
    afterAll(async () => {
        await app.close();
    });
    it('deve rejeitar requisição sem token', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/protected',
        });
        expect(response.statusCode).toBe(401);
        expect(response.json().error.code).toBe('UNAUTHORIZED');
    });
    it('deve rejeitar token inválido', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/protected',
            headers: {
                authorization: 'Bearer token-invalido',
            },
        });
        expect(response.statusCode).toBe(401);
        expect(response.json().error.code).toBe('INVALID_TOKEN');
    });
    it('deve permitir acesso com token válido', async () => {
        const token = await generateAccessToken(fakeUser);
        const response = await app.inject({
            method: 'GET',
            url: '/protected',
            headers: {
                authorization: `Bearer ${token}`,
            },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json().user).toEqual({
            id: fakeUser.id,
            empresaId: fakeUser.empresaId,
            papel: fakeUser.papel,
        });
    });
});
//# sourceMappingURL=authenticate.test.js.map