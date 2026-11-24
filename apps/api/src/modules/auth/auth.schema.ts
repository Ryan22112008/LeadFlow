import { z } from 'zod';

export const registerSchema = z
  .object({
    nomeEmpresa: z.string().trim().min(1).max(120),
    nome: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().email().max(255),
    senha: z
      .string()
      .min(12)
      .max(128)
      .refine((senha) => senha.trim().length > 0, {
        message: 'A senha não pode conter apenas espaços',
      }),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
