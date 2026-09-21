import { prisma } from '@/lib/db';
import { cookies, headers } from 'next/headers';
import { createHash } from 'node:crypto';
import { error as logError } from '@/lib/logger';

const SESSION_COOKIE = 'smart-menu-session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// round89-B3 (dx-4 #3): absolute lifetime cap. The pure sliding window had no
// end date — continuous activity kept renewing a session forever, so a stolen
// cookie stayed valid as long as the thief kept using it. A token is now
// hard-rejected 7 days after createdAt even when the sliding expiry was just
// renewed. The renewal path below also clamps to the same deadline so the DB
// row never claims validity past the cap.
const SESSION_ABSOLUTE_CAP_MS = 7 * 24 * 60 * 60 * 1000; // 7d
const MAX_SESSIONS_PER_USER = 5;

// ponytail: sliding window — validateSession() extends active sessions automatically

function hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: number): Promise<string> {
        const token = crypto.randomUUID();
        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

        // round94-3a (تقرير B LOW-2): الإنشاء والقصّ في معاملة واحدة، والقصّ
        // بعد الإنشاء — كان trimExpiredSessions يُنفَّذ قبل session.create بشرط
        // (active.length > MAX) فيجد 5 جلسات نشطة لا شيء فوقها ليحذفه، ثم
        // تُنشأ سادسة: الحالة المستقرة 6 جلسات لا 5 (off-by-one)، والتسلسل
        // findMany→deleteMany خارج معاملة سمح لتقاطع دخولين متزامنين. الآن
        // يُعدّ الصف الجديد ضمن السقف قبل القصّ (أحدث 4 جلسات أخرى + الجديد =
        // 5 بالضبط)، والصف الجديد محميّ بتوكنه فلا يُبعد بقصّه مهما تعادلت
        // طوابع createdAt (id هنا cuid غير رتيب — الحماية بالتوكن لا بالترتيب).
        await prisma.$transaction(async (tx) => {
                await tx.session.create({
                        data: { userId, token: tokenHash, expiresAt },
                });
                // 1) نظّف المنتهية أولاً كي يعدّ القصّ النشطة فقط
                await tx.session.deleteMany({
                        where: { userId, expiresAt: { lte: new Date() } },
                });
                // 2) عدّ بما فيها الصف الجديد، وابعد الفائض عن السقف
                const active = await tx.session.findMany({
                        where: { userId },
                        orderBy: { createdAt: 'desc' },
                        select: { id: true, token: true },
                });
                if (active.length > MAX_SESSIONS_PER_USER) {
                        const others = active.filter((s) => s.token !== tokenHash);
                        const keep = others
                                .slice(0, MAX_SESSIONS_PER_USER - 1)
                                .map((s) => s.id);
                        await tx.session.deleteMany({
                                where: { userId, id: { notIn: keep }, token: { not: tokenHash } },
                        });
                }
        });

        const c = await cookies();
        c.set(SESSION_COOKIE, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: SESSION_TTL_MS / 1000,
        });

        // إرجاع التوكن الخام ليتمكن طالب الاستدعاء (مثل /api/auth/login مع
        // ترويسة X-Client-Type: mobile) من إرجاعه في جسم الاستجابة. تطبيق
        // الموبايل يخزّنه في SecureStore ويرسله لاحقًا عبر Authorization: Bearer.
        return token;
}

export async function destroySession() {
        const c = await cookies();
        const token = c.get(SESSION_COOKIE)?.value;
        if (token) {
                if (!/^[0-9a-f-]{36}$/i.test(token)) {
                        c.set(SESSION_COOKIE, '', {
                                httpOnly: true,
                                secure: process.env.NODE_ENV === 'production',
                                sameSite: 'lax',
                                path: '/',
                                maxAge: 0,
                        });
                        return;
                }
                const tokenHash = hashToken(token);
                // Retry once: a transient Neon connection error must not leave the
                // session row alive server-side (silent .catch left it resurrectable).
                try {
                        await prisma.session.deleteMany({ where: { token: tokenHash } });
                } catch (e) {
                        logError('session.destroy failed (retrying)', { error: String(e) });
                        await new Promise((r) => setTimeout(r, 300));
                        await prisma.session
                                .deleteMany({ where: { token: tokenHash } })
                                .catch((e2) => logError('session.destroy failed twice', { error: String(e2) }));
                }
        }
        c.set(SESSION_COOKIE, '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 0,
        });
}

/**
 * r119-B6 (B2-M discovery): mobile clients authenticate with
 * `Authorization: Bearer <token>` (SecureStore) — the cookie-based
 * destroySession never covered them, so a mobile logout left the session
 * row alive and the Bearer valid for its full 7-day lifetime. Revokes a
 * session by its RAW token with the same retry-once posture.
 */
export async function destroySessionByToken(rawToken: string) {
        if (!/^[0-9a-f-]{36}$/i.test(rawToken)) return;
        const tokenHash = hashToken(rawToken);
        try {
                await prisma.session.deleteMany({ where: { token: tokenHash } });
        } catch (e) {
                logError('session.destroyByToken failed (retrying)', { error: String(e) });
                await new Promise((r) => setTimeout(r, 300));
                await prisma.session
                        .deleteMany({ where: { token: tokenHash } })
                        .catch((e2) => logError('session.destroyByToken failed twice', { error: String(e2) }));
        }
}

export async function validateSession(): Promise<{
        valid: boolean;
        userId: number | null;
        /** round85-B6: the user row is joined into the same query — requireAuth no
         *  longer needs a second sequential lookup. Undefined = legacy caller/mocks
         *  that don't provide it; null = user row deleted (orphan session). */
        user?: {
                id: number;
                role: string;
                restaurantId: number | null;
                subscriptionStatus: string | null;
                permissions: string[];
        } | null;
}> {
        const c = await cookies();
        let token = c.get(SESSION_COOKIE)?.value;
        // دعم تطبيق الموبايل: عند غياب الكوكي، نلجأ إلى ترويسة Authorization: Bearer.
        // تطبيق React Native لا يستطيع قراءة كوكي httpOnly يُضبط عبر Set-Cookie،
        // لذا يخزّن التوكن الخام في SecureStore ويرسله كـ Bearer. التوكن هو نفس
        // UUID المخزّن (مُجزّأ SHA-256) في جدول Session — نفس منطق الـ sliding
        // window + الـ absolute cap + سقف الـ 5 جلسات/مستخدم يبقى ساريًا.
        if (!token) {
                const h = await headers();
                const authHeader = h.get('authorization') ?? h.get('Authorization');
                if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
                        const bearer = authHeader.slice(7).trim();
                        if (/^[0-9a-f-]{36}$/i.test(bearer)) token = bearer;
                }
        }
        if (!token) return { valid: false, userId: null };

        try {
                const tokenHash = hashToken(token);
                // round85-B6: session + user in ONE query (was findUnique session +
                // separate getUserById on every authenticated request)
                const session = await prisma.session.findUnique({
                        where: { token: tokenHash },
                        include: {
                                user: {
                                        select: {
                                                id: true,
                                                role: true,
                                                restaurantId: true,
                                                subscriptionStatus: true,
                                                permissions: true,
                                        },
                                },
                        },
                });
                if (!session || session.expiresAt < new Date()) {
                        if (session) {
                                await prisma.session
                                        .delete({ where: { id: session.id } })
                                        .catch((e) => logError('session.validate deletion', { error: String(e) }));
                        }
                        return { valid: false, userId: null };
                }
                // round89-B3: absolute cap — reject (and clean up) any token whose
                // age from createdAt reached 7d, regardless of how recently the
                // sliding window renewed it.
                const sessionAgeMs = Date.now() - session.createdAt.getTime();
                if (sessionAgeMs >= SESSION_ABSOLUTE_CAP_MS) {
                        await prisma.session
                                .delete({ where: { id: session.id } })
                                .catch((e) => logError('session.absolute-cap deletion', { error: String(e) }));
                        return { valid: false, userId: null };
                }
                // Sliding window: extend session TTL on every valid check — DB-side ONLY.
                // Do NOT re-send Set-Cookie here: an in-flight response arriving after
                // logout would resurrect the just-cleared cookie (observed in e2e as a
                // "resurrected session": events-poll response landed post-logout and
                // re-minted the cookie). The browser refreshes its own cookie expiry on
                // each login; mid-session re-minting adds nothing but this race.
                //
                // round85-B6: renew only when less than half the TTL remains, so the
                // hot path (requireAuth on EVERY api call + 5s/15s polls) skips the
                // UPDATE entirely — at most one renewal per ~12h instead of per request.
                // Semantics stay sliding: any activity within 12h keeps the session alive.
                const remaining = session.expiresAt.getTime() - Date.now();
                if (remaining < SESSION_TTL_MS / 2) {
                        // round89-B3: the renewal slides at most up to createdAt+7d —
                        // validateSession's absolute-cap check above stays the
                        // authoritative gate either way.
                        const absoluteDeadline = session.createdAt.getTime() + SESSION_ABSOLUTE_CAP_MS;
                        const newExpiry = new Date(
                                Math.min(Date.now() + SESSION_TTL_MS, absoluteDeadline)
                        );
                        await prisma.session
                                .update({
                                        where: { id: session.id },
                                        data: { expiresAt: newExpiry },
                                })
                                .catch((e) => logError('session.extend failed', { error: String(e) }));
                }
                return { valid: true, userId: session.userId, user: session.user };
        } catch (e) {
                logError('session.validate crash', { error: String(e) });
                return { valid: false, userId: null };
        }
}
