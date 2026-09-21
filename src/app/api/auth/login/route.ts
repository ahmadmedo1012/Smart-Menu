import { prisma } from '@/lib/db';
import { error as logError } from '@/lib/logger';
import { error, success } from '@/lib/api-helpers';
import { z } from 'zod';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { notifyEvent } from '@/lib/telegram';
import { runAfterResponse } from '@/lib/bg-task'; // r119-S3-P2-4
import { createSession } from '@/lib/session';
import { verifyHash, needsRehash, hashPassword } from '@/lib/hash';
import { usernamePresence, passwordPresence } from '@/lib/validation';
import { getClientIp } from '@/lib/client-ip';

const loginSchema = z.object({
        username: usernamePresence,
        password: passwordPresence,
});

// round92: exemptFromRelax — the e2e security suite (rbac-negative "11 failed
// logins for one (ip, username) bucket → 429") asserts THIS limiter's real
// budget; under RATE_LIMIT_TEST_RELAX/RELAX it widened (10→1000) and the 11th
// attempt stopped being blocked (CI run on e0b0b1d0). Same documented
// precedent as accountLimiter below. Cross-persona logins each mint their own
// ip:username bucket, so the real budget stays generous for legitimate e2e
// flows (proven: CI ran real-budget login since r86 — relax never worked
// under the standalone server's forced NODE_ENV=production).
const loginLimiter = createDbRateLimiter({ windowMs: 60_000, max: 10, exemptFromRelax: true });
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
// round91-D1/F2 backstop: the limiter above keys on `acct:${ip}:${username}` —
// on non-Vercel deployments (the repo ships output:'standalone' + reverse-proxy
// support) a client ROTATES spoofed x-real-ip/x-forwarded-for values to mint a
// fresh lockout bucket per attempt (proven live in D1 §2.1: three spoofed
// headers → three distinct RateLimitEntry rows). A SECOND limiter keyed on
// username ALONE caps rotating/distributed brute force at 20 failures/15min
// no matter how the IP is spelled. It is checked on the SAME failure-only path
// as the ip-scoped limiter: successful logins never burn it (see the comment
// below) and the missing-user path skips it (ghost usernames must not mint
// auth.lockout audit noise). Accepted, bounded tradeoff: 20 failures from ANY
// IP lock the username for 15 minutes — the price of closing unlimited
// online brute-force; the ip-scoped limiter above stays the primary cap and
// keeps the e2e-asserted strict budget via exemptFromRelax.
const accountBackstopLimiter = createDbRateLimiter({ windowMs: 15 * 60_000, max: 20 }); // round91-D1/F2 backstop

export async function POST(request: Request) {
        try {
                const parsed = loginSchema.safeParse(await request.json());
                if (!parsed.success) return error('يرجى إدخال اسم المستخدم وكلمة المرور', 422);
                const { username, password } = parsed.data;
                const ip = getClientIp(request); // round91-D1: unified extraction
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
                        // round91-D1/F2: the ip-scoped key (`acct:${ip}:${username}`) is spoofable
                        // by IP rotation on non-Vercel — the username-only backstop below runs
                        // on the SAME failure-only path so its 20/15min budget survives rotation.
                        const { success: acctAllowed } = await accountLimiter.check(`acct:${ip}:${username}`);
                        const { success: backstopAllowed } = await accountBackstopLimiter.check(`acct:${username}`);
                        if (!acctAllowed || !backstopAllowed) {
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
                                                        // round91-D1/F2: name WHICH limiter tripped — the
                                                        // username-only backstop is new signal for the feed.
                                                        metadata: {
                                                                username,
                                                                ip,
                                                                limiter: acctAllowed ? 'acct:username' : 'acct:ip:username',
                                                        },
                                                },
                                        });
                                } catch (auditError) {
                                        // round94 (W1-b/fix 3): still best-effort — never blocks
                                        // the 429 — but the catch was EMPTY: a silent swallow that
                                        // hid real DB write failures from the feed and, in unit
                                        // runs, a TypeError proving the write never happened (the
                                        // auth.lockout coverage was fake-green). Log it (same
                                        // pattern as the outer catch below) and keep the 429.
                                        logError('auth.lockout audit write failed', {
                                                error:
                                                        auditError instanceof Error
                                                                ? auditError.message
                                                                : String(auditError),
                                        });
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
                // r119-S3-P2-4: the admin broadcast is observability, not part of the
                // auth contract — awaiting it put up to ~10s of Telegram-transport
                // latency (and 504 risk) inside the login critical path. after()
                // runs it post-response on Vercel; notifyEvent is already
                // never-throwing + 10s-bounded (r118), so the response can't be
                // delayed or failed by it anymore.
                runAfterResponse(() =>
                        notifyEvent('user_login', { username: user.username, name: user.name, role: user.role }, { adminOnly: true })
                );

                // Create server-side session
                const sessionToken = await createSession(user.id);

                // دعم تطبيق الموبايل: عند ضبط ترويسة X-Client-Type: mobile، نُرجع
                // أيضًا التوكن الخام في جسم JSON. fetch في React Native لا يستطيع
                // قراءة كوكي httpOnly يُضبط عبر Set-Cookie، لذا يخزّنه التطبيق
                // في SecureStore ويرسله لاحقًا كـ Authorization: Bearer. الكوكي
                // يبقى يُضبط لعملاء الويب — سلوك الويب ما تغيّر إطلاقًا.
                const isMobileClient = request.headers.get('x-client-type') === 'mobile';

                return success({
                        user: {
                                id: user.id,
                                username: user.username,
                                name: user.name,
                                role: user.role,
                                restaurantId: user.restaurantId,
                                subscriptionStatus: user.subscriptionStatus ?? 'UNPAID',
                        },
                        ...(isMobileClient ? { sessionToken } : {}),
                });
        } catch (e) {
                logError('Login error:', { error: e instanceof Error ? e.message : String(e) });
                return error('حدث خطأ في الخادم', 500);
        }
}
