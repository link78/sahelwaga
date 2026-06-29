/* eslint-disable no-console */
/**
 * Reset a user's password.
 *
 * Usage (run from the repo root or packages/db):
 *
 *   pnpm --filter @sahelwaga/db reset-password -- --email user@example.com --password 'NewPass123!'
 *
 * The email and password may also be supplied via environment variables so the
 * new password never lands in your shell history:
 *
 *   RESET_EMAIL=user@example.com RESET_PASSWORD='NewPass123!' \
 *     pnpm --filter @sahelwaga/db reset-password
 *
 * The password is hashed with bcrypt (cost 10) to match the rest of the app
 * (see prisma/seed.ts and the API auth code). The target user must already
 * exist — this script only updates an existing account, it does not create one.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 10;
const MIN_PASSWORD_LENGTH = 8;

/** Read a named `--flag value` pair from argv, if present. */
function readFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  return inline ? inline.slice(`--${name}=`.length) : undefined;
}

async function main() {
  const email = (readFlag('email') ?? process.env.RESET_EMAIL)?.trim();
  const password = readFlag('password') ?? process.env.RESET_PASSWORD;

  if (!email || !password) {
    console.error(
      'Usage: reset-password --email <email> --password <newPassword>\n' +
        '       (or set RESET_EMAIL / RESET_PASSWORD env vars)',
    );
    process.exit(1);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `Refusing to set a password shorter than ${MIN_PASSWORD_LENGTH} characters.`,
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      console.error(`No user found with email "${email}". Nothing was changed.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    console.log(`Password updated for ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
