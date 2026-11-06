
export type CreatePasswordResetTokenInput = {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
};

export interface PasswordResetRepository {
    createPasswordResetToken(
        input: CreatePasswordResetTokenInput,
    ): Promise<void>;

   resetPassword(
    tokenHash: string,
    senhaHash: string,
): Promise<boolean>;
}
