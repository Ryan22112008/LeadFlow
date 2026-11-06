
import type {
    AuthenticatedUser,
    CreateRefreshTokenInput,
} from './auth.types.js';

export type RotateRefreshTokenInput = {
    currentTokenHash: string;
    newTokenHash: string;
    expiresAt: Date;
};

export interface RefreshTokenRepository {
    rotateRefreshToken(
        input: RotateRefreshTokenInput,
    ): Promise<AuthenticatedUser | null>;

    revokeRefreshToken(
        tokenHash: string,
    ): Promise<boolean>;

    createRefreshToken(
        input: CreateRefreshTokenInput,
    ): Promise<void>;
}


