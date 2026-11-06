
import { describe, expect, it } from 'vitest';

import {
    generatePasswordResetToken,
    hashPasswordResetToken,
    PASSWORD_RESET_TOKEN_TTL_MS,
    getPasswordResetTokenExpiration,
} from '../src/security/password-reset-token.js';

describe('Password Reset Token', () => {
    it('deve gerar um token com 64 caracteres hexadecimais', () => {
        const token = generatePasswordResetToken();

        expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('deve gerar tokens diferentes', () => {
        const tokenA = generatePasswordResetToken();
        const tokenB = generatePasswordResetToken();

        expect(tokenA).not.toBe(tokenB);
    });

    it('deve gerar um hash SHA-256 consistente', () => {
        const token = 'token-de-teste';

        const hashA = hashPasswordResetToken(token);
        const hashB = hashPasswordResetToken(token);

        expect(hashA).toBe(hashB);
        expect(hashA).toMatch(/^[a-f0-9]{64}$/);
    });

    it('não deve armazenar o token original como hash', () => {
        const token = generatePasswordResetToken();
        const hash = hashPasswordResetToken(token);

        expect(hash).not.toBe(token);
    });

    it('deve definir validade de 30 minutos', () => {
        expect(PASSWORD_RESET_TOKEN_TTL_MS).toBe(30 * 60 * 1000);
    });

    it('deve calcular corretamente a expiração', () => {
        const now = new Date('2026-11-06T12:00:00.000Z');

        const expiration = getPasswordResetTokenExpiration(now);

        expect(expiration.getTime() - now.getTime()).toBe(
            30 * 60 * 1000,
        );
    });
});
    