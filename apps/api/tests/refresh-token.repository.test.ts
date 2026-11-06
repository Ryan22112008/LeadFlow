import { describe, expect, it, vi } from 'vitest';

import type {
    RefreshTokenRepository,
    RotateRefreshTokenInput,
} from '../src/modules/auth/refresh-token.repository.js';

import type { AuthenticatedUser } from '../src/modules/auth/auth.types.js';

describe('RefreshTokenRepository', () => {
    const fakeUser: AuthenticatedUser = {
        id: 'user-123',
        empresaId: 'company-123',
        nome: 'Ryan',
        email: 'ryan@example.com',
        papel: 'OWNER',
    };

    it('deve retornar o usuário quando a rotação for válida', async () => {
        const rotateRefreshToken = vi.fn()
            .mockResolvedValue(fakeUser);

        const repository: RefreshTokenRepository = {
            rotateRefreshToken,
        };

        const input: RotateRefreshTokenInput = {
            currentTokenHash: 'old-hash',
            newTokenHash: 'new-hash',
            expiresAt: new Date('2026-11-13T12:00:00.000Z'),
        };

        const result = await repository.rotateRefreshToken(input);

        expect(result).toEqual(fakeUser);
        expect(rotateRefreshToken).toHaveBeenCalledWith(input);
    });

    it('deve retornar null quando o token não puder ser renovado', async () => {
        const repository: RefreshTokenRepository = {
            rotateRefreshToken: vi.fn().mockResolvedValue(null),
        };

        const input: RotateRefreshTokenInput = {
            currentTokenHash: 'invalid-hash',
            newTokenHash: 'new-hash',
            expiresAt: new Date('2026-11-13T12:00:00.000Z'),
        };

        const result = await repository.rotateRefreshToken(input);

        expect(result).toBeNull();
    });
});