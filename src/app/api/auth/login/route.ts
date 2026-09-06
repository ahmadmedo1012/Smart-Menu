import { prisma } from '@/lib/db';
import { error as logError } from '@/lib/logger';
import { error, success } from '@/lib/api-helpers';
import { z } from 'zod';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { notifyEvent } from '@/lib/telegram';
import { createSession } from '@/lib/session';
import { verifyHash, needsRehash, hashPassword } from '@/lib/hash';
import { usernamePresence, passwordPresence } from '@/lib/validation';

const loginSchema = z.object({
        username: usernamePresence,
        password: passwordPresence,
});

const loginLimiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });
// round90-F6: dummy hash for timing equalization — a missing user used to
// return before verifyHash (~0ms) while an existing user pays the full
// pbkdf2 cost (~290ms at 600k iterations), making username enumeration
// trivial by response latency alone. Computed ONCE at module load with the
// CURRENT parameters so the burned cost matches a v2 stored hash; the
// result is discarded and the SAME 401 body is returned either way.
// Known limitation (accepted, documented): legacy 100k-iteration hashes
// verify ~6× faster than this dummy — the login-time transparent rehash
// (round85-A3) migrates those away, so the skew shrinks over time.
// The account limiter is intentionally NOT called on the missing-user path:
// it costs one indexed DB write (~ms) vs the 290ms KDF — below noise — and
// calling it would mint `auth.lockout` audit events for ghost usernames.
const DUMMY_HASH = hashPassword('round90-f6-timing-equalizer');
// Account-level limiter — protects against distributed brute force across IPs.
// exemptFromRelax keeps its real budget under dev RATE_LIMIT_RELAX so the e2e
// lockout test's 21-failed-logins → 429 assertion stays valid locally.
const accountLimiter = createDbRateLimiter({
        windowMs: 15 * 60_000,
        max: 20,
        exemptFromRelax: true,
});

export async function POST(request: Request) {
        try {
                const parsed = loginSchema.safeParse(await request.json());
                if (!parsed.success) return error('يرجى إدخال اسم المستخدم وكلمة المرور', 400);
                const { username, password } = parsed.data;
                const ip =
                        request.headers.get('x-real-ip') ||
                        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                        'unknown';
                const lockKey = `${ip}:${username}`;
                const { success: allowed } = await loginLimiter.check(lockKey);
                if (!allowed) {
                        return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);
                }
                const user = await prisma.user.findUnique({
                        where: { username },
                        select: {
                                id: true,
                                username: true,
                                password: true,
                                name: true,
                                role: true,
                                restaurantId: true,
                                subscriptionStatus: true,
                        },
                });

                if (!user) {
                        // round90-F6: burn the same KDF cost as an existing user so
                        // the missing-user path is latency-indistinguishable, then
                        // return the identical 401 (no content oracle either).
                        void verifyHash(password, DUMMY_HASH);
                        return error('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
                }

                const valid = verifyHash(password, user.password);
                if (!valid) {
                        // Account+IP throttle — checked ONLY on failed auth so successful logins
                        // never count toward the window (legit use from one IP used to fill the
                        // 20-count budget and lock real accounts).
                        // Keyed on IP+username — username alone lets any attacker lock any
                        // account (unauthenticated DoS).
                        const { success: acctAllowed } = await accountLimiter.check(`acct:${ip}:${username}`);
                        if (!acctAllowed) {
                                // round88-B7: audit the lockout ITSELF (not each 401 — the feed
                                // must stay signal): a warning SystemEvent the moment the
                                // account limiter trips. Fire-and-forget with a synchronous
                                // guard — logging must never break the 429 path.
                                try {
                                        await prisma.systemEvent.create({
                                                data: {
                                                        eventType: 'auth.lockout',
                                                        title: 'قفل حساب مؤقت',
                                                        message: `قُفل حساب «${username}» مؤقتاً بعد 20 محاولة فاشلة خلال 15 دقيقة`,
                                                        severity: 'warning',
                                                        metadata: { username, ip, limiter: 'acct:ip:username' },
                                                },
                                        });
                                } catch {
                                        /* best-effort audit — never block the 429 */
                                }
                                return error('تم قفل الحساب مؤقتاً لكثرة المحاولات الفاشلة. حاول لاحقاً.', 429);
                        }
                        return error('اسم المستخدم أو كلمة المرور غير صحيحة', 401);
                }

                // Record last login, audit, telegram notification.
                // Login-time transparent rehash (round85-A3): if the stored hash still
                // uses legacy/weaker parameters, upgrade it to the current ITERATIONS
                // without asking the user to change anything.
                await prisma.user.update({
                        where: { id: user.id },
                        data: {
                                lastLoginAt: new Date(),
                                ...(needsRehash(user.password) ? { password: hashPassword(password) } : {}),
                        },
                });
                await logAudit({
                        action: 'login',
                        actorId: user.id,
                        targetType: 'user',
                        targetId: user.id,
                        ip,
                });
                await notifyEvent(
                        'user_login',
                        { username: user.username, name: user.name, role: user.role },
                        { adminOnly: true }
                );

                // Create server-side session
                await createSession(user.id);

                return success({
                        user: {
                                id: user.id,
                                username: user.username,
                                name: user.name,
                                role: user.role,
                                restaurantId: user.restaurantId,
                                subscriptionStatus: user.subscriptionStatus ?? 'UNPAID',
                        },
                });
        } catch (e) {
                logError('Login error:', { error: e instanceof Error ? e.message : String(e) });
                return error('حدث خطأ في الخادم', 500);
        }
}
