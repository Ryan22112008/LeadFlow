
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

import { authRoutes } from '../src/modules/auth/auth.routes.js';
import { hashPassword } from '../src/security/password.js';

import type { AuthRepository } from '../src/modules/auth/auth.repository.js';
import type { RefreshTokenRepository } from '../src/modules/auth/refresh-token.repository.js';
import type { AuthenticatedUser } from '../src/modules/auth/auth.types.js';
import type { PasswordResetRepository } from '../src/modules/auth/password-reset.repository.js';

describe('Auth Routes', () => {
    const app = buildApp();

    let refreshTokenUser: AuthenticatedUser | null = null;

    let loginUser: (AuthenticatedUser & { senhaHash: string }) | null = null;

    const fakeRepository: AuthRepository = {
        async createCompanyWithOwner() {
            return {
                userId: 'user-123',
                companyId: 'company-123',
            };
        },

        async findUserByEmail(email) {
            if (email !== loginUser?.email) {
                return null;
            }

            return loginUser;
        },
    };

    const fakeRefreshTokenRepository: RefreshTokenRepository = {
        async createRefreshToken() { },

        async rotateRefreshToken() {
            return refreshTokenUser;
        },

        async revokeRefreshToken() {
            return true;
        },
    };
    const fakePasswordResetRepository: PasswordResetRepository = {
        async createPasswordResetToken() { },

        async resetPassword() {
            return true;
        },
    };

    beforeAll(async () => {
        const senhaHash = await hashPassword('SenhaSegura123!');

        loginUser = {
            id: 'user-123',
            empresaId: 'company-123',
            nome: 'Ryan',
            email: 'ryan@example.com',
            papel: 'OWNER',
            senhaHash,
        };

        await app.register(
            authRoutes(
                fakeRepository,
                fakeRefreshTokenRepository,
                fakePasswordResetRepository,
            ),
        );

        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('deve rejeitar um cadastro com dados inválidos', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/auth/register',
            payload: {
                nome: 'R',
                email: 'email-invalido',
                senha: '123',
                nomeEmpresa: 'A',
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('deve processar um cadastro válido', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/auth/register',
            payload: {
                nome: 'Ryan',
                email: 'ryan@example.com',
                senha: 'SenhaSegura123!',
                nomeEmpresa: 'Imobiliária Exemplo',
            },
        });

        expect(response.statusCode).toBe(201);

        expect(response.json()).toMatchObject({
            message: 'Empresa cadastrada com sucesso.',
            data: {
                userId: 'user-123',
                companyId: 'company-123',
            },
        });
    });

    it('deve rejeitar login com dados inválidos', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: {
                email: 'email-invalido',
                senha: '',
            },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('deve rejeitar login com credenciais incorretas', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: {
                email: 'ryan@example.com',
                senha: 'SenhaErrada123!',
            },
        });

        expect(response.statusCode).toBe(401);
        expect(response.json().code).toBe('INVALID_CREDENTIALS');
    });

    it('deve realizar login com credenciais válidas', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: {
                email: 'ryan@example.com',
                senha: 'SenhaSegura123!',
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            message: 'Login realizado com sucesso.',
            data: {
                user: {
                    id: 'user-123',
                    empresaId: 'company-123',
                    papel: 'OWNER',
                },
            },
        });

        expect(response.json().data.accessToken).toBeTypeOf('string');
        expect(response.json().data.user.senhaHash).toBeUndefined();
        expect(response.headers['set-cookie']).toContain('leadflow_refresh=');
        expect(response.headers['set-cookie']).toContain('HttpOnly');
    });

    it('deve rejeitar refresh sem cookie', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/auth/refresh',
        });

        expect(response.statusCode).toBe(401);
        expect(response.json().code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('deve rejeitar refresh com token inválido', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/auth/refresh',
            headers: {
                cookie: 'leadflow_refresh=token-invalido',
            },
        });

        expect(response.statusCode).toBe(401);
        expect(response.json().code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('deve renovar a sessão com refresh token válido', async () => {
        refreshTokenUser = {
            id: 'user-123',
            empresaId: 'company-123',
            nome: 'Ryan',
            email: 'ryan@example.com',
            papel: 'OWNER',
        };

        const response = await app.inject({
            method: 'POST',
            url: '/auth/refresh',
            headers: {
                cookie: 'leadflow_refresh=token-valido',
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toMatchObject({
            message: 'Sessão renovada com sucesso.',
            data: {
                user: {
                    id: 'user-123',
                    empresaId: 'company-123',
                    papel: 'OWNER',
                },
            },
        });

        expect(response.json().data.accessToken).toBeTypeOf('string');
        expect(response.headers['set-cookie']).toContain('leadflow_refresh=');
        expect(response.headers['set-cookie']).toContain('HttpOnly');

        refreshTokenUser = null;
    });

    it('deve realizar logout e limpar o cookie', async () => {
        refreshTokenUser = null;

        const response = await app.inject({
            method: 'POST',
            url: '/auth/logout',
            headers: {
                cookie: 'leadflow_refresh=token-valido',
            },
        });

        expect(response.statusCode).toBe(204);
        expect(response.headers['set-cookie']).toContain('leadflow_refresh=');
        expect(response.headers['set-cookie']).toContain('Max-Age=0');
    });

    it('deve permitir logout mesmo sem refresh token', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/auth/logout',
        });

        expect(response.statusCode).toBe(204);
    });
});
