import { describe, expect, it } from 'vitest';

import {
    hashPassword,
    verifyPassword,
} from '../src/security/password.js';

describe('Password Security', () => {
    it('deve gerar um hash diferente da senha original', async () => {
        const password = 'SenhaSegura123!';

        const passwordHash = await hashPassword(password);

        expect(passwordHash).not.toBe(password);
        expect(passwordHash).toContain('$argon2id$');
    });

    it('deve validar uma senha correta', async () => {
        const password = 'SenhaSegura123!';

        const passwordHash = await hashPassword(password);

        const isValid = await verifyPassword(password, passwordHash);

        expect(isValid).toBe(true);
    });

    it('deve rejeitar uma senha incorreta', async () => {
        const password = 'SenhaSegura123!';

        const passwordHash = await hashPassword(password);

        const isValid = await verifyPassword(
            'SenhaIncorreta123!',
            passwordHash,
        );

        expect(isValid).toBe(false);
    });
});