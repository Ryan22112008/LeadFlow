import { describe, expect, it } from 'vitest';

import { AuthService } from '../src/modules/auth/auth.service.js';
import { verifyPassword } from '../src/security/password.js';
import { hashRefreshToken } from '../src/security/refresh-token.js';
import { verifyAccessToken } from '../src/security/jwt.js';
import type { PasswordResetRepository } from '../src/modules/auth/password-reset.repository.js';
import { hashPasswordResetToken } from '../src/security/password-reset-token.js';
import type { AuthRepository } from '../src/modules/auth/auth.repository.js';
import type { RefreshTokenRepository } from '../src/modules/auth/refresh-token.repository.js';
import type { CreateCompanyWithOwnerInput, AuthenticatedUser } from '../src/modules/auth/auth.types.js';

describe('AuthService', () => {
    const fakeAuthRepository: AuthRepository = {
        async createCompanyWithOwner() {
            return {
                userId: 'user-123',
                companyId: 'company-123',
            };
        },

        async findUserByEmail() {
            return null;
        },
    };

    const fakePasswordResetRepository: PasswordResetRepository = {
        async createPasswordResetToken() { },

        async resetPassword() {
            return true;
        },
    };


    it('deve gerar o hash da senha antes de enviar os dados ao repositório', async () => {
        const senhaOriginal = 'SenhaSegura123!';

        let dadosRecebidos: CreateCompanyWithOwnerInput | undefined;


        const authRepository: AuthRepository = {
            async createCompanyWithOwner(input) {
                dadosRecebidos = input;

                return {
                    userId: 'user-123',
                    companyId: 'company-123',
                };
            },

            async findUserByEmail() {
                return null;
            },
        };

        const refreshTokenRepository: RefreshTokenRepository = {
            async rotateRefreshToken() {
                return null;
            },
        };

        const authService = new AuthService(
            authRepository,
            refreshTokenRepository,
            fakePasswordResetRepository,
        );

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

    it('deve renovar a sessão quando o refresh token for válido', async () => {
        const fakeUser: AuthenticatedUser = {
            id: 'user-123',
            empresaId: 'company-123',
            nome: 'Ryan',
            email: 'ryan@example.com',
            papel: 'OWNER',
        };

        let tokenHashRecebido = '';

        const refreshTokenRepository: RefreshTokenRepository = {
            async rotateRefreshToken(input) {
                tokenHashRecebido = input.currentTokenHash;

                expect(input.newTokenHash).not.toBe(input.currentTokenHash);
                expect(input.expiresAt.getTime()).toBeGreaterThan(Date.now());

                return fakeUser;
            },
        };

        const authService = new AuthService(
            fakeAuthRepository,
            refreshTokenRepository,
        );

        const tokenAtual = 'refresh-token-atual';
        const resultado = await authService.refresh(tokenAtual);

        expect(resultado).not.toBeNull();
        expect(tokenHashRecebido).toBe(hashRefreshToken(tokenAtual));

        expect(resultado?.user).toEqual(fakeUser);
        expect(resultado?.tokens.refreshToken).not.toBe(tokenAtual);

        const payload = await verifyAccessToken(
            resultado!.tokens.accessToken,
        );

        expect(payload.sub).toBe(fakeUser.id);
        expect(payload.empresaId).toBe(fakeUser.empresaId);
        expect(payload.papel).toBe(fakeUser.papel);
    });

    it('deve rejeitar a renovação quando o refresh token for inválido', async () => {
        const refreshTokenRepository: RefreshTokenRepository = {
            async rotateRefreshToken() {
                return null;
            },
        };

        const authService = new AuthService(
            fakeAuthRepository,
            refreshTokenRepository,
        );

        const resultado = await authService.refresh('token-invalido');

        expect(resultado).toBeNull();
    });
    it('deve revogar o refresh token usando seu hash no logout', async () => {
        let tokenHashRecebido = '';

        const refreshTokenRepository: RefreshTokenRepository = {
            async rotateRefreshToken() {
                return null;
            },

            async revokeRefreshToken(tokenHash) {
                tokenHashRecebido = tokenHash;
                return true;
            },
        };

        const authService = new AuthService(
            fakeAuthRepository,
            refreshTokenRepository,
        );

        const tokenOriginal = 'refresh-token-para-logout';

        await authService.logout(tokenOriginal);

        expect(tokenHashRecebido).toBe(
            hashRefreshToken(tokenOriginal),
        );

        expect(tokenHashRecebido).not.toBe(tokenOriginal);
    });


    it('deve realizar login com credenciais válidas', async () => {
        const senha = 'SenhaSegura123!';
        const senhaHash = await import('../src/security/password.js')
            .then(({ hashPassword }) => hashPassword(senha));

        const fakeUser: AuthenticatedUser & { senhaHash: string } = {
            id: 'user-123',
            empresaId: 'company-123',
            nome: 'Ryan',
            email: 'ryan@example.com',
            papel: 'OWNER',
            senhaHash,
        };

        let dadosRefreshRecebidos: {
            userId: string;
            tokenHash: string;
            expiresAt: Date;
        } | undefined;

        const authRepository: AuthRepository = {
            async createCompanyWithOwner() {
                return {
                    userId: 'user-123',
                    companyId: 'company-123',
                };
            },

            async findUserByEmail(email) {
                expect(email).toBe('ryan@example.com');
                return fakeUser;
            },
        };

        const refreshTokenRepository: RefreshTokenRepository = {
            async createRefreshToken(input) {
                dadosRefreshRecebidos = input;
            },

            async rotateRefreshToken() {
                return null;
            },

            async revokeRefreshToken() {
                return true;
            },
        };

        const authService = new AuthService(
            authRepository,
            refreshTokenRepository,
        );

        const resultado = await authService.login({
            email: 'ryan@example.com',
            senha,
        });

        expect(resultado).not.toBeNull();
        expect(resultado?.user.id).toBe('user-123');
        expect(resultado?.user).not.toHaveProperty('senhaHash');

        expect(resultado?.tokens.accessToken).toBeTypeOf('string');
        expect(resultado?.tokens.refreshToken).toBeTypeOf('string');

        expect(dadosRefreshRecebidos).toBeDefined();
        expect(dadosRefreshRecebidos?.userId).toBe('user-123');
        expect(dadosRefreshRecebidos?.tokenHash).toBe(
            hashRefreshToken(resultado!.tokens.refreshToken),
        );
    });

    it('deve rejeitar login com senha incorreta', async () => {
        const { hashPassword } = await import('../src/security/password.js');
        const senhaHash = await hashPassword('SenhaCorreta123!');

        const authRepository: AuthRepository = {
            async createCompanyWithOwner() {
                return {
                    userId: 'user-123',
                    companyId: 'company-123',
                };
            },

            async findUserByEmail() {
                return {
                    id: 'user-123',
                    empresaId: 'company-123',
                    nome: 'Ryan',
                    email: 'ryan@example.com',
                    papel: 'OWNER',
                    senhaHash,
                };
            },
        };

        const refreshTokenRepository: RefreshTokenRepository = {
            async createRefreshToken() {
                throw new Error('Não deveria criar sessão.');
            },

            async rotateRefreshToken() {
                return null;
            },

            async revokeRefreshToken() {
                return true;
            },
        };

        const authService = new AuthService(
            authRepository,
            refreshTokenRepository,
        );

        const resultado = await authService.login({
            email: 'ryan@example.com',
            senha: 'SenhaErrada123!',
        });

        expect(resultado).toBeNull();
    });

    it('deve rejeitar login quando o usuário não existir', async () => {
        const authRepository: AuthRepository = {
            async createCompanyWithOwner() {
                return {
                    userId: 'user-123',
                    companyId: 'company-123',
                };
            },

            async findUserByEmail() {
                return null;
            },
        };

        const refreshTokenRepository: RefreshTokenRepository = {
            async createRefreshToken() {
                throw new Error('Não deveria criar sessão.');
            },

            async rotateRefreshToken() {
                return null;
            },

            async revokeRefreshToken() {
                return true;
            },
        };

        const authService = new AuthService(
            authRepository,
            refreshTokenRepository,
        );

        const resultado = await authService.login({
            email: 'inexistente@example.com',
            senha: 'SenhaQualquer123!',
        });

        expect(resultado).toBeNull();
    });

});