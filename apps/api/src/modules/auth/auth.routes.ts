import type { FastifyPluginAsync } from 'fastify';
import {
  EmailAlreadyRegisteredError,
  PasswordHashCapacityError,
  registerCompanyAndOwner,
} from './auth.service.ts';
import { registerSchema } from './auth.schema.ts';

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/auth/register',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parsedBody = registerSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.code(400).send({ error: 'Dados inválidos' });
      }

      try {
        const result = await registerCompanyAndOwner(parsedBody.data);
        return reply.code(201).send(result);
      } catch (error: unknown) {
        if (error instanceof EmailAlreadyRegisteredError) {
          return reply.code(409).send({ error: 'E-mail já cadastrado' });
        }
        if (error instanceof PasswordHashCapacityError) {
          return reply
            .code(503)
            .send({ error: 'Serviço temporariamente sobrecarregado. Tente novamente.' });
        }

        request.log.error('Public registration failed');
        return reply.code(500).send({ error: 'Não foi possível concluir o cadastro' });
      }
    },
  );
};

export default authRoutes;
