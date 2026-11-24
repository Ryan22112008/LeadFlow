
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),

    HOST: z
        .string()
        .trim()
        .min(1)
        .default('0.0.0.0'),

    PORT: z.coerce
        .number()
        .int()
        .min(1)
        .max(65535)
        .default(3000),


    DATABASE_URL: z
        .string()
        .url('DATABASE_URL deve ser uma URL válida')
        .refine((value) => {
            const protocol = new URL(value).protocol;

            return protocol === 'postgresql:' || protocol === 'postgres:';
        }, 'DATABASE_URL deve utilizar o protocolo PostgreSQL'),

});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    const errors = parsedEnv.error.issues.map((issue) => ({
        variable: issue.path.join('.'),
        message: issue.message,
    }));

    throw new Error(
        `Configuração de ambiente inválida:\n${JSON.stringify(errors, null, 2)}`,
    );
}

export const env = parsedEnv.data;

export type Env = z.infer<typeof envSchema>;
