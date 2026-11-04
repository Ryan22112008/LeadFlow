import { describe, expect, it } from 'vitest';

import { AuthService } from '../src/modules/auth/auth.service.js';
import { verifyPassword } from '../src/security/password.js';

import type { AuthRepository } from '../src/modules/auth/auth.repository.js';
import type { CreateCompanyWithOwnerInput } from '../src/modules/auth/auth.types.js';

describe('AuthService', () => {
    it('deve gerar o hash da senha antes de enviar os dados ao repositório', async () => {
        const senhaOriginal = 'SenhaSegura123!';

        let dadosRecebidos: CreateCompanyWithOwnerInput | undefined;

        const fakeRepository: AuthRepository = {
            async createCompanyWithOwner(input) {
                dadosRecebidos = input;

                return {
                    userId: 'user-123',
                    companyId: 'company-123',
                };
            },
        };

        const authService = new AuthService(fakeRepository);

        const resultado = await authService.register({
            nome: 'Ryan',
            email: 'ryan@example.com',
            senha: senhaOriginal,
            nomeEmpresa: 'Imobiliária Exemplo',
        });

        expect(resultado).toEqual({
            userId: 'user-123',
            companyId: 'company-123',
        });

        expect(dadosRecebidos).toBeDefined();
        expect(dadosRecebidos?.senhaHash).not.toBe(senhaOriginal);

        expect(
            await verifyPassword(
                senhaOriginal,
                dadosRecebidos!.senhaHash,
            ),
        ).toBe(true);
    });
});