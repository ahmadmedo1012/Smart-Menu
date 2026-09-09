#!/usr/bin/env node
/** r97: align local admin password with the r92 sweep contract (SEED_ADMIN_PASS=smart123).
 * Uses the same LEGACY KDF as ci-seed (pbkdf2 sha512 100k, salt:hash) so the
 * login path still exercises legacy-verify + rehash-on-login. */
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import pg from 'pg';

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const url = process.env.DATABASE_URL;
const pass = process.env.SEED_ADMIN_PASS || 'smart123';
const c = new pg.Client({ connectionString: url });
await c.connect();
const { rows } = await c.query(
  'UPDATE "User" SET password = $1, "updatedAt" = now() WHERE username = $2 RETURNING id, username',
  [hashPassword(pass), 'admin'],
);
console.log('admin password reset to SEED_ADMIN_PASS contract:', rows[0] ? `user id=${rows[0].id}` : 'NOT FOUND');
await c.end();
