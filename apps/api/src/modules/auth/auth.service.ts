import { argon2, randomBytes } from 'node:crypto';
import { PapelUsuario, Prisma, StatusEmpresa } from '@prisma/client';
import type { RegisterInput } from './auth.schema.ts';
import { prisma } from '../../shared/prisma.ts';

const ARGON2_MEMORY_KIB = 65_536;
const ARGON2_PASSES = 3;
const ARGON2_PARALLELISM = 1;
const ARGON2_TAG_LENGTH = 32;

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('Email already registered');
    this.name = 'EmailAlreadyRegisteredError';
  }
}

function encodeBase64WithoutPadding(value: Buffer): string {
  return value.toString('base64').replace(/=+$/u, '');
}

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);

  return new Promise((resolve, reject) => {
    argon2(
      'argon2id',
      {
        message: password,
        nonce: salt,
        parallelism: ARGON2_PARALLELISM,
        tagLength: ARGON2_TAG_LENGTH,
        memory: ARGON2_MEMORY_KIB,
        passes: ARGON2_PASSES,
      },
      (error, digest) => {
        if (error) {
          reject(error);
          return;
        }

        const saltText = encodeBase64WithoutPadding(salt);
        const digestText = encodeBase64WithoutPadding(digest);
        resolve(
          `$argon2id$v=19$m=${ARGON2_MEMORY_KIB},t=${ARGON2_PASSES},p=${ARGON2_PARALLELISM}$${saltText}$${digestText}`,
        );
      },
    );
  });
}

function isDuplicateEmailError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;

  return (
    target === 'usuarios_email_key' ||
    (Array.isArray(target) && target.includes('email'))
  );
}

export async function registerCompanyAndOwner(input: RegisterInput) {
  const senhaHash = await hashPassword(input.senha);

  try {
    return await prisma.$transaction(async (transaction) => {
      const empresa = await transaction.empresa.create({
        data: {
          nome: input.nomeEmpresa,
          status: StatusEmpresa.ATIVA,
        },
        select: {
          id: true,
          nome: true,
          status: true,
        },
      });

      const usuario = await transaction.usuario.create({
        data: {
          nome: input.nome,
          email: input.email,
          senhaHash,
          papel: PapelUsuario.OWNER,
          empresaId: empresa.id,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          papel: true,
        },
      });

      return { empresa, usuario };
    });
  } catch (error: unknown) {
    if (isDuplicateEmailError(error)) {
      throw new EmailAlreadyRegisteredError();
    }

    throw error;
  }
}
