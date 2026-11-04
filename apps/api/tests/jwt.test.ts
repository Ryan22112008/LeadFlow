import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';

import {
    generateAccessToken,
    verifyAccessToken,
} from '../src/security/jwt.js';

import type { AuthenticatedUser } from '../src/modules/auth/auth.types.js';

const fakeUser: AuthenticatedUser = {
    id: 'user-123',
    empresaId: 'company-123',
    nome: 'Ryan',
    email: 'ryan@example.com',
    papel: 'OWNER',
};

describe('JWT', () => {
    it('deve gerar um access token válido', async () => {
        const token = await generateAccessToken(fakeUser);

        expect(token).toBeTypeOf('string');
        expect(token.split('.')).toHaveLength(3);
    });

    it('deve verificar um token e recuperar os dados do usuário', async () => {
        const token = await generateAccessToken(fakeUser);

        const payload = await verifyAccessToken(token);

        expect(payload.sub).toBe(fakeUser.id);
        expect(payload.empresaId).toBe(fakeUser.empresaId);
        expect(payload.papel).toBe(fakeUser.papel);
    });

    it('deve rejeitar um token inválido', async () => {
        await expect(
            verifyAccessToken('token-invalido'),
        ).rejects.toThrow();
    });

    it('deve rejeitar um token expirado', async () => {
        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET,
        );

        const expiredToken = await new SignJWT({
            empresaId: fakeUser.empresaId,
            papel: fakeUser.papel,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(fakeUser.id)
            .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
            .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
            .sign(secret);

        await expect(
            verifyAccessToken(expiredToken),
        ).rejects.toThrow();
    });
});