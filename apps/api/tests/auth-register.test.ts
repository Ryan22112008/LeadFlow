import type { InjectOptions } from 'fastify';
import { PapelUsuario, Prisma, StatusEmpresa } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';


const prismaMocks = vi.hoisted(() => {
  const empresaCreate = vi.fn();
  const usuarioCreate = vi.fn();
  const disconnect = vi.fn();

  const transactionClient = {
    empresa: { create: empresaCreate },
    usuario: { create: usuarioCreate },
  };

  return {
    empresaCreate,
    usuarioCreate,
    disconnect,
    transactionClient,
    transaction: vi.fn(),
  };
});


vi.mock('../src/shared/prisma.ts', () => ({
  prisma: {
    $transaction: prismaMocks.transaction,
    $disconnect: prismaMocks.disconnect,
  },
}));

import { buildApp } from '../src/app.ts';

const app = await buildApp();

const empresa = {
  id: 'company-id',
  nome: 'Imobiliária Horizonte',
  status: StatusEmpresa.ATIVA,
};

const usuario = {
  id: 'user-id',
  nome: 'Ana Souza',
  email: 'ana@example.com',
  papel: PapelUsuario.OWNER,
};

const validBody = {
  nomeEmpresa: 'Imobiliária Horizonte',
  nome: 'Ana Souza',
  email: '  ANA@EXAMPLE.COM  ',
  senha: 'senha-segura-de-teste',
};

let testIpCounter = 1;

function registerRequest(
  payload: InjectOptions['payload'] = validBody,
  remoteAddress: string = `10.0.0.${testIpCounter++}`,
) {
  return app.inject({
    method: 'POST',
    url: '/auth/register',
    payload,
    remoteAddress,
  });
}

function useCallbackTransaction(): void {
  prismaMocks.transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback !== 'function') {
      throw new Error('Expected a Prisma transaction callback');
    }

    const operation = callback as (client: unknown) => Promise<unknown>;
    return operation(prismaMocks.transactionClient);
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  prismaMocks.empresaCreate.mockResolvedValue(empresa);
  prismaMocks.usuarioCreate.mockResolvedValue(usuario);
  prismaMocks.disconnect.mockResolvedValue(undefined);
  useCallbackTransaction();
});

afterAll(async () => {
  await app.close();

  expect(prismaMocks.disconnect).toHaveBeenCalledOnce();
});

describe('POST /auth/register', () => {
  it('creates a company and assigns OWNER to the first user', async () => {
    const response = await registerRequest();

    expect(response.statusCode).toBe(201);
    expect(response.json()).toStrictEqual({ empresa, usuario });
    expect(prismaMocks.transaction).toHaveBeenCalledOnce();
    expect(prismaMocks.empresaCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { nome: validBody.nomeEmpresa, status: StatusEmpresa.ATIVA },
      }),
    );
    expect(prismaMocks.usuarioCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          papel: PapelUsuario.OWNER,
          senhaHash: expect.stringMatching(/^\$argon2id\$v=19\$/u),
        }),
      }),
    );
  });

  it('rejects registration when Argon2 concurrency limit is reached', async () => {
    const requests = await Promise.all(
      Array.from({ length: 3 }, () => registerRequest()),
    );

    const statuses = requests
      .map((response) => response.statusCode)
      .sort((a, b) => a - b);

    expect(statuses).toStrictEqual([201, 201, 503]);
    expect(prismaMocks.transaction).toHaveBeenCalledTimes(2);
  });

  it('limits registration attempts to five per minute per IP', async () => {
    const rateLimitIp = '192.0.2.10';
    const invalidPayload = { ...validBody, email: 'not-an-email' };
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await registerRequest(invalidPayload, rateLimitIp);
      statuses.push(response.statusCode);
    }

    expect(statuses).toStrictEqual([400, 400, 400, 400, 400, 429]);
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it('normalizes the email before persistence', async () => {
    await registerRequest();

    expect(prismaMocks.usuarioCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'ana@example.com' }),
      }),
    );
  });



  it.each([
    ['missing name', { ...validBody, nome: '' }],
    ['blank name', { ...validBody, nome: '   ' }],
    ['blank company name', { ...validBody, nomeEmpresa: '   ' }],
    ['invalid email', { ...validBody, email: 'not-an-email' }],
    ['short password', { ...validBody, senha: 'curta' }],
    ['password containing only spaces', { ...validBody, senha: '            ' }],
    ['missing required field', { nomeEmpresa: validBody.nomeEmpresa }],
  ])('rejects %s', async (_description, payload) => {
    const response = await registerRequest(payload);

    expect(response.statusCode).toBe(400);
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it.each(['papel', 'empresaId', 'status', 'id', 'campoExtra'])(
    'rejects client supplied %s',
    async (field) => {
      const response = await registerRequest({
        ...validBody,
        [field]: 'forged-value',
      });

      expect(response.statusCode).toBe(400);
      expect(prismaMocks.transaction).not.toHaveBeenCalled();
    },
  );

  it('returns 409 for an email uniqueness conflict', async () => {
    const duplicateEmail = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: 'test', meta: { target: ['email'] } },
    );
    prismaMocks.transaction.mockRejectedValue(duplicateEmail);

    const response = await registerRequest();

    expect(response.statusCode).toBe(409);
    expect(response.json()).toStrictEqual({ error: 'E-mail já cadastrado' });
    expect(response.body).not.toContain('Unique constraint failed');
  });

  it('simulates transaction rollback when user creation fails', async () => {
    const persisted: string[] = [];
    let pendingWrites: string[] = [];

    prismaMocks.empresaCreate.mockImplementation(async () => {
      pendingWrites.push('empresa');
      return empresa;
    });
    prismaMocks.usuarioCreate.mockImplementation(async () => {
      pendingWrites.push('usuario');
      throw new Error('sensitive database error');
    });
    prismaMocks.transaction.mockImplementation(async (callback: unknown) => {
      if (typeof callback !== 'function') {
        throw new Error('Expected a Prisma transaction callback');
      }

      pendingWrites = [];
      const operation = callback as (client: unknown) => Promise<unknown>;
      try {
        const result = await operation(prismaMocks.transactionClient);
        persisted.push(...pendingWrites);
        return result;
      } catch (error: unknown) {
        pendingWrites = [];
        throw error;
      }
    });

    const response = await registerRequest();

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('sensitive database error');
    expect(persisted).toStrictEqual([]);
    expect(prismaMocks.transaction).toHaveBeenCalledOnce();
    expect(prismaMocks.empresaCreate).toHaveBeenCalledOnce();
    expect(prismaMocks.usuarioCreate).toHaveBeenCalledOnce();
  });
});
