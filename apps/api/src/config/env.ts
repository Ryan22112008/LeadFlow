import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

    JWT_SECRET: z
    .string()
    .min(32, 'O JWT_SECRET deve ter pelo menos 32 caracteres.'),
    
  API_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3333),

  API_HOST: z.string().default('127.0.0.1'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);