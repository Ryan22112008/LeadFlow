import { z } from 'zod';

export const registerSchema = z.strictObject({
    nome: z
        .string()
        .trim()
        .min(2, 'O nome deve ter pelo menos 2 caracteres.')
        .max(120, 'O nome deve ter no máximo 120 caracteres.'),

    email: z
        .string()
        .trim()
        .toLowerCase()
        .max(254, 'O e-mail deve ter no máximo 254 caracteres.')
        .pipe(z.email('Informe um endereço de e-mail válido.')),

    senha: z
        .string()
        .min(12, 'A senha deve ter pelo menos 12 caracteres.')
        .max(128, 'A senha deve ter no máximo 128 caracteres.'),

    nomeEmpresa: z
        .string()
        .trim()
        .min(2, 'O nome da empresa deve ter pelo menos 2 caracteres.')
        .max(150, 'O nome da empresa deve ter no máximo 150 caracteres.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;