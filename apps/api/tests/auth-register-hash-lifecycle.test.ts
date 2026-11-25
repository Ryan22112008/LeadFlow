import type { InjectOptions } from 'fastify';
import { PapelUsuario, StatusEmpresa } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

type Argon2Callback = (error: Error | null, digest: Buffer) => void;

type Argon2Options = {
  tagLength: number;
};

const cryptoMocks = vi.hoisted(() => ({
  argon2: vi.fn(),
  randomBytes: vi.fn(),
}));

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

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();

  return {
    ...actual,
    argon2: cryptoMocks.argon2,
    randomBytes: cryptoMocks.randomBytes,
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
  email: 'ana@example.com',
  senha: 'senha-segura-de-teste',
};

let testIpCounter = 1;

function registerRequest(payload: InjectOptions['payload'] = validBody) {
  return app.inject({
    method: 'POST',
    url: '/auth/register',
    payload,
    remoteAddress: `198.18.0.${testIpCounter++}`,
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

function succeedSaltGeneration(): void {
  cryptoMocks.randomBytes.mockImplementation((size: number) => Buffer.alloc(size, 0x2b));
}

function succeedHashAsynchronously(): void {
  cryptoMocks.argon2.mockImplementation(
    (_algorithm: string, options: Argon2Options, callback: Argon2Callback) => {
      setImmediate(() => callback(null, Buffer.alloc(options.tagLength, 0x3c)));
    },
  );
}

function failHashAsynchronously(): void {
  cryptoMocks.argon2.mockImplementation(
    (_algorithm: string, _options: Argon2Options, callback: Argon2Callback) => {
      setImmediate(() => callback(new Error('Argon2 failure'), Buffer.alloc(0)));
    },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  prismaMocks.empresaCreate.mockResolvedValue(empresa);
  prismaMocks.usuarioCreate.mockResolvedValue(usuario);
  prismaMocks.disconnect.mockResolvedValue(undefined);
  useCallbackTransaction();
  succeedSaltGeneration();
  succeedHashAsynchronously();
});

afterAll(async () => {
  await app.close();

  expect(prismaMocks.disconnect).toHaveBeenCalledOnce();
});

describe('POST /auth/register password hashing lifecycle', () => {
  it('releases capacity when salt generation throws synchronously', async () => {
    cryptoMocks.randomBytes.mockImplementation(() => {
      throw new Error('salt generation failed');
    });

    const first = await registerRequest();
    const second = await registerRequest();

    expect([first.statusCode, second.statusCode]).toStrictEqual([500, 500]);

    succeedSaltGeneration();

    const response = await registerRequest();

    expect(response.statusCode).toBe(201);
  });

  it('releases capacity when Argon2 throws synchronously', async () => {
    cryptoMocks.argon2.mockImplementation(() => {
      throw new Error('Argon2 invocation failed');
    });

    const first = await registerRequest();
    const second = await registerRequest();

    expect([first.statusCode, second.statusCode]).toStrictEqual([500, 500]);

    succeedHashAsynchronously();

    const response = await registerRequest();

    expect(response.statusCode).toBe(201);
  });

  it('releases capacity when Argon2 reports an asynchronous error', async () => {
    failHashAsynchronously();

    const first = await registerRequest();
    const second = await registerRequest();

    expect([first.statusCode, second.statusCode]).toStrictEqual([500, 500]);

    succeedHashAsynchronously();

    const response = await registerRequest();

    expect(response.statusCode).toBe(201);
  });

  it('releases only one slot when Argon2 invokes the callback and then throws', async () => {
    cryptoMocks.argon2.mockImplementationOnce(
      (_algorithm: string, _options: Argon2Options, callback: Argon2Callback) => {
        callback(new Error('Argon2 callback failure'), Buffer.alloc(0));
        throw new Error('Argon2 failure after callback');
      },
    );

    const failed = await registerRequest();

    expect(failed.statusCode).toBe(500);

    const responses = await Promise.all([
      registerRequest(),
      registerRequest(),
      registerRequest(),
    ]);

    const statuses = responses
      .map((response) => response.statusCode)
      .sort((a, b) => a - b);

    expect(statuses).toStrictEqual([201, 201, 503]);
  });
});
