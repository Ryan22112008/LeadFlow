import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

import { env } from '../config/env.js';
import type { AuthenticatedUser } from '../modules/auth/auth.types.js';

const JWT_EXPIRES_IN = '15m';
const JWT_ALGORITHM = 'HS256';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

const accessTokenPayloadSchema = z.object({
    sub: z.string().min(1),
    empresaId: z.string().min(1),
    papel: z.enum(['OWNER', 'ADMIN', 'CORRETOR']),
});

export async function generateAccessToken(
    user: AuthenticatedUser,
): Promise<string> {
    return new SignJWT({
        empresaId: user.empresaId,
        papel: user.papel,
    })
        .setProtectedHeader({ alg: JWT_ALGORITHM })
        .setSubject(user.id)
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRES_IN)
        .sign(JWT_SECRET);
}

export async function verifyAccessToken(token: string) {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
        algorithms: [JWT_ALGORITHM],
        requiredClaims: ['sub', 'iat', 'exp'],
    });

    return accessTokenPayloadSchema.parse(payload);
}