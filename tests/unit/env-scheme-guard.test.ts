import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from '@/lib/env';

/**
 * round90-F6 — DATABASE_URL scheme guard.
 *
 * A foreign shell DATABASE_URL (SQLite `file:...` from another project)
 * silently overrides .env and used to explode deep inside the pg Pool.
 * The schema now rejects anything that doesn't start with postgresql://
 * or postgres:// — loud, early, with the actual cause.
 *
 * URLs here are deliberately credential-free (check-secrets scans the tree).
 */

describe('env — DATABASE_URL scheme guard (round90-F6)', () => {
	const OLD_ENV = { ...process.env };

	beforeEach(() => {
		// valid floors for the other required keys so the scheme is the ONLY
		// failing constraint under test
		process.env.JWT_SECRET = 'a'.repeat(64);
		process.env.AUTH_SECRET = 's'.repeat(32);
	});

	afterEach(() => {
		Object.assign(process.env, OLD_ENV);
	});

	it('file: (SQLite from a foreign shell) → throws with the PostgreSQL hint', () => {
		process.env.DATABASE_URL = 'file:/home/someone/db/custom.db';

		// dev path: safeParse fails → partial().parse re-throws on the
		// present-but-invalid value — loud even outside production
		expect(() => validateEnv()).toThrow(/PostgreSQL/);
	});

	it('postgresql:// passes', () => {
		process.env.DATABASE_URL = 'postgresql://localhost:5432/smartmenu';

		const env = validateEnv();
		expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/smartmenu');
	});

	it('postgres:// passes (short scheme alias)', () => {
		process.env.DATABASE_URL = 'postgres://localhost:5432/testdb';

		expect(() => validateEnv()).not.toThrow();
	});
});
