import { createHash, randomBytes } from 'node:crypto';
import type { UserTokenPurpose } from '../../generated/prisma/client.js';
import { frontendOrigin } from '../../shared/config/session.js';
import { prisma } from '../../shared/db/prisma.js';

const tokenLifetimeMs: Record<UserTokenPurpose, number> = {
  INVITE: 72 * 60 * 60 * 1000,
  RESET: 60 * 60 * 1000,
};

// Replaces any earlier token of the same purpose so only the latest link works.
export async function issueUserToken(
  userId: number,
  purpose: UserTokenPurpose,
): Promise<string> {
  const token = randomBytes(32).toString('base64url');

  await prisma.$transaction([
    prisma.userToken.deleteMany({ where: { userId, purpose } }),
    prisma.userToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hashUserToken(token),
        expiresAt: new Date(Date.now() + tokenLifetimeMs[purpose]),
      },
    }),
  ]);

  return token;
}

export function findValidUserToken(token: string) {
  return prisma.userToken.findFirst({
    where: { tokenHash: hashUserToken(token), expiresAt: { gt: new Date() } },
  });
}

export function buildActivationUrl(token: string): string {
  return `${frontendOrigin}/auth/activate?token=${token}`;
}

function hashUserToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
