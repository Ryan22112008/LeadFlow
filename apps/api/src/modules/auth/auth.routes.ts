import type { FastifyInstance } from 'fastify';

import { loginSchema, registerSchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import type { AuthRepository } from './auth.repository.js';
import type { RefreshTokenRepository } from './refresh-token.repository.js';
import type { PasswordResetRepository } from './password-reset.repository.js';

const REFRESH_COOKIE_NAME = 'leadflow_refresh';

export function authRoutes(
    authRepository: AuthRepository,
    refreshTokenRepository: RefreshTokenRepository,
    passwordResetRepository: PasswordResetRepository,
) {
    const authService = new AuthService(
        authRepository,
        refreshTokenRepository,
        passwordResetRepository,
    );

    return async function (app: FastifyInstance) {
        app.post(
            '/auth/register',
            async (request, reply) => {
                const input = registerSchema.parse(request.body);

                const result = await authService.register(input);

                return reply.status(201).send({
                    message: 'Empresa cadastrada com sucesso.',
                    data: result,
                });
            },

        );

        app.post('/auth/refresh', async (request, reply) => {
            const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

            if (!refreshToken) {
                return reply.status(401).send({
                    message: 'Sessão inválida ou expirada.',
                    code: 'INVALID_REFRESH_TOKEN',
                });
            }

            const result = await authService.refresh(refreshToken);

            if (!result) {
                return reply.status(401).send({
                    message: 'Sessão inválida ou expirada.',
                    code: 'INVALID_REFRESH_TOKEN',
                });
            }

            reply.setCookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/auth',
                maxAge: 7 * 24 * 60 * 60,
            });

            return reply.status(200).send({
                message: 'Sessão renovada com sucesso.',
                data: {
                    user: result.user,
                    accessToken: result.tokens.accessToken,
                },
            });
        });

        app.post('/auth/logout', async (request, reply) => {
            const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

            if (refreshToken) {
                await authService.logout(refreshToken);
            }

            reply.clearCookie(REFRESH_COOKIE_NAME, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/auth',
            });

            return reply.status(204).send();
        });

        app.post('/auth/login', async (request, reply) => {
            const input = loginSchema.parse(request.body);

            const result = await authService.login(input);

            if (!result) {
                return reply.status(401).send({
                    message: 'E-mail ou senha inválidos.',
                    code: 'INVALID_CREDENTIALS',
                });
            }

            reply.setCookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/auth',
                maxAge: 7 * 24 * 60 * 60,
            });

            return reply.status(200).send({
                message: 'Login realizado com sucesso.',
                data: {
                    user: result.user,
                    accessToken: result.tokens.accessToken,
                },
            });
        });
    };
}