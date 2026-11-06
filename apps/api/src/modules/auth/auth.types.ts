export type RegisterUserInput = {
    nome: string;
    email: string;
    senha: string;
    nomeEmpresa: string;
};

export type AuthenticatedUser = {
    id: string;
    empresaId: string;
    nome: string;
    email: string;
    papel: 'OWNER' | 'ADMIN' | 'CORRETOR';
};

export type CreateCompanyWithOwnerInput = {
    nome: string;
    email: string;
    senhaHash: string;
    nomeEmpresa: string;
};

export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};

export type AuthSession = {
    user: AuthenticatedUser;
    tokens: AuthTokens;
};

export type AuthenticatedPrincipal = {
    id: string;
    empresaId: string;
    papel: 'OWNER' | 'ADMIN' | 'CORRETOR';
};

export type RefreshTokenRecord = {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
};

export type CreateRefreshTokenInput = {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
};

export type RefreshSessionResult = {
    user: AuthenticatedUser;
    tokens: AuthTokens;
};