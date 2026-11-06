
import { randomBytes, createHash } from 'node:crypto';

const PASSWORD_RESET_TOKEN_BYTES = 32;

export function generatePasswordResetToken(): string {
    return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
}

export function hashPasswordResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export function getPasswordResetTokenExpiration(
    now: Date = new Date(),
): Date {
    return new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
}
