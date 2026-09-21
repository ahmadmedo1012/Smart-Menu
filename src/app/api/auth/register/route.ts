import { prisma } from '@/lib/db';
import { error, handleError, success } from '@/lib/api-helpers';
import { z } from 'zod';
import { hashPassword } from '@/lib/hash';
import { createDbRateLimiter } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { notifyEvent } from '@/lib/telegram';
import { runAfterResponse } from '@/lib/bg-task'; // r119-S3-P2-4
import { createSession } from '@/lib/session';
import { usernameField, passwordField, nameField } from '@/lib/validation';
import { getClientIp } from '@/lib/client-ip';

const registerSchema = z.object({
        username: usernameField,
        password: passwordField,
        name: nameField,
        email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
});

const registerLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: Request) {
        try {
                const ip = getClientIp(request); // round91-D1: unified extraction
                const { success: allowed } = await registerLimiter.check(`register:${ip}`);
                if (!allowed) {
                        return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);
                }

                const body = await request.json().catch(() => {
                        throw new Error('JSON parse error');
                });
                // round92-wave3-5: ننزع وسوم HTML قبل zod (الترتيب: body → strip → zod)
                // — سياسة الطول تُفحص على القيمة المنقّاة التي ستُخزَّن فعلاً؛ سابقًا كان
                // اسم خام محمّلًا بالوسوم يجتاز حد الطول ثم يُقصَّر بالتنقية فيُخزَّن
                // مخالفًا للسياسة (اكتشاف 3-b رقم 3). الحقول غير النصية تمر كما هي.
                const stripTags = (v: unknown): unknown =>
                        (typeof v === 'string' ? v.replace(/<[^>]*>/g, '') : v);
                const sanitizeInput = (raw: unknown): unknown =>
                        raw && typeof raw === 'object' && !Array.isArray(raw)
                                ? {
                                        ...(raw as Record<string, unknown>),
                                        username: stripTags((raw as Record<string, unknown>).username),
                                        name: stripTags((raw as Record<string, unknown>).name),
                                }
                                : raw;
                const parsed = registerSchema.safeParse(sanitizeInput(body));
                if (!parsed.success) {
                        return error(parsed.error.issues[0].message, 400);
                }
                const { username, password, name, email } = parsed.data;

                // Check username uniqueness
                const existing = await prisma.user.findUnique({ where: { username } });
                if (existing) {
                        return error('اسم المستخدم موجود مسبقاً', 409);
                }

                // Check email uniqueness when provided (round-77 account agent:
                // duplicate emails were silently allowed)
                if (email?.trim()) {
                        const emailTaken = await prisma.user.findFirst({ where: { email: email.trim() } });
                        if (emailTaken) {
                                return error('البريد الإلكتروني مستخدم مسبقاً', 409);
                        }
                }

                const hashed = hashPassword(password);

                const user = await prisma.user.create({
                        data: {
                                username,
                                password: hashed,
                                name,
                                email: email || '',
                                role: 'USER',
                                subscriptionStatus: 'UNPAID',
                        },
                        select: {
                                id: true,
                                username: true,
                                name: true,
                                role: true,
                                subscriptionStatus: true,
                                createdAt: true,
                        },
                });

                // Create session (auto-login)
                await createSession(user.id);

                // Audit + Telegram
                await logAudit({
                        action: 'create',
                        actorId: user.id,
                        targetType: 'user',
                        targetId: user.id,
                        ip,
                });
                // r119-S3-P2-4: same as login — broadcast moves off the critical path.
                runAfterResponse(() =>
                        notifyEvent('user_registered', { username: user.username, name: user.name }, { adminOnly: true })
                );

                return success(
                        {
                                id: user.id,
                                username: user.username,
                                name: user.name,
                                role: user.role,
                                subscriptionStatus: user.subscriptionStatus,
                        },
                        201
                );
        } catch (e) {
                // Prisma unique constraint
                if (e instanceof Error && e.message.includes('Unique constraint failed')) {
                        return error('اسم المستخدم موجود مسبقاً', 409);
                }
                return handleError(e);
        }
}
