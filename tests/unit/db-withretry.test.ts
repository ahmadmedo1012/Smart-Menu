/**
 * Round88-D2 — withRetry unit coverage (src/lib/db.ts was 27.45% — the
 * shared resilience layer every money-path query goes through).
 *
 * Imports the REAL db module (no prisma mock): constructing the client and
 * its pg pool is lazy — no connection is opened until a query runs, and
 * withRetry itself never touches the DB, so these tests stay hermetic.
 *
 * Guards the documented contract: only the transient Postgres SQLSTATE /
 * message set (40001 serialization, 40P01 deadlock, 57014 cancel, 08000
 * connection, P2034 write conflict, connection/timeout/deadlock/500 text)
 * is retried; anything else fails fast; retries are bounded.
 */
import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '@/lib/db';

/** Error carrying a Prisma/Postgres-style `code` property. */
function codedError(code: string, message = `DB failure ${code}`): Error & { code: string } {
        const e = new Error(message) as Error & { code: string };
        e.code = code;
        return e;
}

describe('withRetry — transient error codes are retried', () => {
        it.each(['40001', '40P01', '57014', '08000', 'P2034'])(
                'SQLSTATE %s: first attempt fails, second succeeds → result returned',
                async (code) => {
                        const fn = vi
                                .fn<() => Promise<string>>()
                                .mockRejectedValueOnce(codedError(code))
                                .mockResolvedValueOnce('recovered');

                        const out = await withRetry(fn);

                        expect(out).toBe('recovered');
                        expect(fn).toHaveBeenCalledTimes(2);
                }
        );

        it('immediate success → single attempt, no retry delay', async () => {
                const fn = vi.fn<() => Promise<number>>().mockResolvedValue(42);

                const out = await withRetry(fn);

                expect(out).toBe(42);
                expect(fn).toHaveBeenCalledTimes(1);
        });
});

describe('withRetry — transient error messages are retried (no code property)', () => {
        it.each(['Connection terminated due to connection timeout', 'query took too long: timeout', 'deadlock detected', 'got 500 from Neon'])(
                'message %j: retried and recovers',
                async (message) => {
                        const fn = vi
                                .fn<() => Promise<string>>()
                                .mockRejectedValueOnce(new Error(message))
                                .mockResolvedValueOnce('ok');

                        const out = await withRetry(fn);

                        expect(out).toBe('ok');
                        expect(fn).toHaveBeenCalledTimes(2);
                }
        );
});

describe('withRetry — non-transient errors fail fast', () => {
        it('plain logic error (no code, no transient text) → thrown immediately, zero retries', async () => {
                const boom = new Error('boom');
                const fn = vi.fn<() => Promise<void>>().mockRejectedValue(boom);

                await expect(withRetry(fn)).rejects.toThrow('boom');
                expect(fn).toHaveBeenCalledTimes(1);
        });

        it('a PERMANENT prisma error code (P2002 unique) is NOT retried', async () => {
                const fn = vi.fn<() => Promise<void>>().mockRejectedValue(codedError('P2002', 'Unique constraint failed'));

                await expect(withRetry(fn)).rejects.toThrow('Unique constraint failed');
                expect(fn).toHaveBeenCalledTimes(1);
        });
});

describe('withRetry — bounded retries', () => {
        it('persistent transient error → exactly retries+1 attempts, then the error surfaces', async () => {
                const fn = vi.fn<() => Promise<void>>().mockRejectedValue(codedError('40001'));

                await expect(withRetry(fn)).rejects.toThrow('DB failure 40001');
                // default retries = 2 → 1 initial + 2 retries
                expect(fn).toHaveBeenCalledTimes(3);
        });

        it('retries=0 → single attempt even for transient errors', async () => {
                const fn = vi.fn<() => Promise<void>>().mockRejectedValue(codedError('08000'));

                await expect(withRetry(fn, 0)).rejects.toThrow('DB failure 08000');
                expect(fn).toHaveBeenCalledTimes(1);
        });

        it('the LAST error is the one thrown after exhaustion (not a wrapped one)', async () => {
                const first = codedError('40001', 'first');
                const last = codedError('08000', 'second');
                const fn = vi
                        .fn<() => Promise<void>>()
                        .mockRejectedValueOnce(first)
                        .mockRejectedValueOnce(codedError('40P01', 'mid'))
                        .mockRejectedValueOnce(last);

                await expect(withRetry(fn)).rejects.toMatchObject({ message: 'second', code: '08000' });
        });
});

describe('withRetry — backoff between attempts', () => {
        it('waits between retries (≥100ms after attempt 1, ≥200ms after attempt 2)', async () => {
                const fn = vi
                        .fn<() => Promise<void>>()
                        .mockRejectedValueOnce(codedError('40001'))
                        .mockRejectedValueOnce(codedError('40001'))
                        .mockRejectedValueOnce(codedError('40001'));

                const start = Date.now();
                await expect(withRetry(fn)).rejects.toThrow();
                const elapsed = Date.now() - start;

                // setTimeout guarantees a minimum; only a broken backoff (0ms
                // tight loop hammering the DB) can fail this floor.
                expect(elapsed).toBeGreaterThanOrEqual(300 - 20);
        });
});
