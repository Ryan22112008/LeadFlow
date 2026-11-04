import argon2 from 'argon2';

const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    hashLength: 32,
    raw: false,
} as const;

export async function hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
    password: string,
    passwordHash: string,
): Promise<boolean> {
    return argon2.verify(passwordHash, password);
}