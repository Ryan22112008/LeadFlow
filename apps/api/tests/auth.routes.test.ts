import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

import { authRoutes } from '../src/modules/auth/auth.routes.js';

import type { AuthRepository } from '../src/modules/auth/auth.repository.js';

describe('Auth Routes', () => {
    const app = buildApp();

    const fakeRepository: AuthRepository = {
        async createCompanyWithOwner() {
            return {
                userId: 'user-123',
                companyId: 'company-123',
            };
        },
    };

    beforeAll(async () => {
        await app.register(authRoutes(fakeRepository));
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
});