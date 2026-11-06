import { randomBytes, createHash } from 'node:crypto';

const REFRESH_TOKEN_BYTES = 32;

/**
 * Gera um refresh token criptograficamente seguro.
 */
export function generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

/**
 * Gera o hash SHA-256 de um refresh token.
 */
export function hashRefreshToken(token: string): string {
    return createHash('sha256')
        .update(token)
        .digest('hex');
}

export const REFRESH_TOKEN_TTL_MS =
    7 * 24 * 60 * 60 * 1000;

/**
 * Calcula a data de expiração do refresh token.
 */
export function getRefreshTokenExpiration(
    now: Date = new Date(),
): Date {
    return new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);
}