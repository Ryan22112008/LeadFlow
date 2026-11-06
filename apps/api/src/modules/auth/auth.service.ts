import type { RegisterInput } from './auth.schemas.js';
import type { AuthRepository } from './auth.repository.js';

import { hashPassword } from '../../security/password.js';

import type { RefreshTokenRepository } from './refresh-token.repository.js';
import type { LoginInput } from './auth.schemas.js';
import { verifyPassword } from '../../security/password.js';
import type { PasswordResetRepository } from './password-reset.repository.js';

import {
    generatePasswordResetToken,
    hashPasswordResetToken,
    getPasswordResetTokenExpiration,
} from '../../security/password-reset-token.js';
import {
    generateRefreshToken,
    hashRefreshToken,
    getRefreshTokenExpiration,
} from '../../security/refresh-token.js';

import { generateAccessToken } from '../../security/jwt.js';


export class AuthService {

    constructor(
        private readonly authRepository: AuthRepository,
        private readonly refreshTokenRepository: RefreshTokenRepository,
        private readonly passwordResetRepository: PasswordResetRepository,
    ) { }

    async register(input: RegisterInput) {
        const senhaHash = await hashPassword(input.senha);

        return this.authRepository.createCompanyWithOwner({
            nome: input.nome,
            email: input.email,
            senhaHash,
            nomeEmpresa: input.nomeEmpresa,
        });
    }

    async refresh(refreshToken: string) {
        const currentTokenHash = hashRefreshToken(refreshToken);

        const newRefreshToken = generateRefreshToken();
        const newTokenHash = hashRefreshToken(newRefreshToken);

        const user = await this.refreshTokenRepository.rotateRefreshToken({
            currentTokenHash,
            newTokenHash,
            expiresAt: getRefreshTokenExpiration(),
        });

        if (!user) {
            return null;
        }

        const accessToken = await generateAccessToken(user);

        return {
            user,
            tokens: {
                accessToken,
                refreshToken: newRefreshToken,
            },
        };
    }

    async logout(refreshToken: string): Promise<void> {
        const tokenHash = hashRefreshToken(refreshToken);

        await this.refreshTokenRepository.revokeRefreshToken(tokenHash);
    }

    async login(input: LoginInput) {
        const user = await this.authRepository.findUserByEmail(
            input.email,
        );

        if (!user) {
            return null;
        }

        const senhaValida = await verifyPassword(
            input.senha,
            user.senhaHash,
        );

        if (!senhaValida) {
            return null;
        }

        const refreshToken = generateRefreshToken();

        await this.refreshTokenRepository.createRefreshToken({
            userId: user.id,
            tokenHash: hashRefreshToken(refreshToken),
            expiresAt: getRefreshTokenExpiration(),
        });

        const accessToken = await generateAccessToken(user);

        const { senhaHash: _, ...authenticatedUser } = user;

        return {
            user: authenticatedUser,
            tokens: {
                accessToken,
                refreshToken,
            },
        };
    }
    async requestPasswordReset(email: string) {
        const user = await this.authRepository.findUserByEmail(email);

        if (!user) {
            return null;
        }

        const token = generatePasswordResetToken();
        const tokenHash = hashPasswordResetToken(token);

        await this.passwordResetRepository.createPasswordResetToken({
            userId: user.id,
            tokenHash,
            expiresAt: getPasswordResetTokenExpiration(),
        });

        return { token };
    }

    async resetPassword(token: string, senha: string): Promise<boolean> {
        const tokenHash = hashPasswordResetToken(token);
        const senhaHash = await hashPassword(senha);

        return this.passwordResetRepository.resetPassword(
            tokenHash,
            senhaHash,
        );
    }
}