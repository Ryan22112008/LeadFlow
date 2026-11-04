import type { CreateCompanyWithOwnerInput } from './auth.types.js';

export interface AuthRepository {
    createCompanyWithOwner(
        input: CreateCompanyWithOwnerInput,
    ): Promise<{
        userId: string;
        companyId: string;
    }>;
}