import type { RegisterInput } from './auth.schemas.js';
import type { AuthRepository } from './auth.repository.js';

import { hashPassword } from '../../security/password.js';

export class AuthService {
    constructor(
        private readonly authRepository: AuthRepository,
    ) {}

    async register(input: RegisterInput) {
        const senhaHash = await hashPassword(input.senha);

        return this.authRepository.createCompanyWithOwner({
            nome: input.nome,
            email: input.email,
            senhaHash,
            nomeEmpresa: input.nomeEmpresa,
        });
    }
}