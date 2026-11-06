import { describe, expect, it } from 'vitest';

import {
    generateRefreshToken,
    hashRefreshToken,
    getRefreshTokenExpiration,
    REFRESH_TOKEN_TTL_MS,
} from '../src/security/refresh-token.js';

describe('Refresh Token', () => {
    it('deve gerar um token seguro', () => {
        const token = generateRefreshToken();

        expect(token).toHaveLength(64);
        expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it('deve gerar tokens diferentes', () => {
        const tokenA = generateRefreshToken();
        const tokenB = generateRefreshToken();

        expect(tokenA).not.toBe(tokenB);
    });

    it('deve gerar o mesmo hash para o mesmo token', () => {
        const token = generateRefreshToken();

        const hashA = hashRefreshToken(token);
        const hashB = hashRefreshToken(token);

        expect(hashA).toBe(hashB);
    });

    it('não deve armazenar o token original como hash', () => {
        const token = generateRefreshToken();
        const hash = hashRefreshToken(token);

        expect(hash).not.toBe(token);
        expect(hash).toHaveLength(64);
    });

    it('deve definir a expiração para 7 dias', () => {
        const now = new Date('2026-11-06T12:00:00.000Z');

        const expiration = getRefreshTokenExpiration(now);

        expect(expiration.getTime() - now.getTime())
            .toBe(REFRESH_TOKEN_TTL_MS);

        expect(REFRESH_TOKEN_TTL_MS)
            .toBe(7 * 24 * 60 * 60 * 1000);
    });
});