
import type {
    AuthenticatedUser,
    CreateCompanyWithOwnerInput,
} from './auth.types.js';

export type LoginUserRecord = AuthenticatedUser & {
    senhaHash: string;
};

export interface AuthRepository {
    createCompanyWithOwner(
        input: CreateCompanyWithOwnerInput,
    ): Promise<{
        userId: string;
        companyId: string;
    }>;

    findUserByEmail(
        email: string,
    ): Promise<LoginUserRecord | null>;
}
