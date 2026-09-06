import { error as logError, warn as logWarn } from '@/lib/logger';
import { z } from 'zod';

const envSchema = z.object({
        DATABASE_URL: z
                .string()
                .min(1, 'DATABASE_URL مطلوب — يجب تعيين رابط قاعدة البيانات')
                // round90-F6: حارس مخطط الاتصال — قيمة SQLite/ملف (مثل file:...) تصل
                // غالبًا من متغير شل لمشروع آخر (Next/Prisma لا يستبدلان متغيرًا موجودًا
                // مسبقًا في البيئة، فيغلب ملف .env) ثم تنفجر لاحقًا في أعماق pg Pool
                // برسالة بلا معنى. فشل مبكر بالسبب الفعلي بدل ذلك. ملاحظة: الفحص داخل
                // validateEnv نفسها، فمتغير SKIP_ENV_CHECK يبقي عقده كما هو (تجاوز كامل
                // — CI/Postgres المحلية تعتمد عليه — انظر src/lib/db.ts).
                .refine(
                        (u) => u.startsWith('postgresql://') || u.startsWith('postgres://'),
                        'DATABASE_URL يجب أن يكون رابط PostgreSQL يبدأ بـ postgresql:// أو postgres:// — القيمة الحالية تبدو رابط SQLite/ملف يسرب من بيئة خارجية ويغلب ملف .env. الحل: نفّذ unset DATABASE_URL في الشل ثم اعتمد على .env، أو صحّح القيمة في .env',
                ),
        // round89-A5 (dx-4 #6): weak floors let a short master secret reach
        // production derivations (HMAC/AES-GCM keys in keys.ts derive from
        // these). 64/32 chars ≈ 256/128+ bits of entropy headroom for a
        // random string. Local .env values verified to pass.
        JWT_SECRET: z.string().min(64, 'JWT_SECRET يجب أن يكون 64 حرفاً على الأقل'),
        NEXT_PUBLIC_DOMAIN: z.url('NEXT_PUBLIC_DOMAIN مطلوب — رابط الموقع (مثال: https://example.com)'),
        NEXT_PUBLIC_WHATSAPP_NUMBER: z
                .string()
                .min(1, 'NEXT_PUBLIC_WHATSAPP_NUMBER مطلوب — رقم واتساب المطعم الذي يستقبل الطلبات'),
        TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
        TELEGRAM_CHAT_ID: z.string().optional().default(''),
        AUTH_SECRET: z.string().min(32, 'AUTH_SECRET يجب أن يكون 32 حرفاً على الأقل'),
        DATABASE_SCHEMA: z.string().optional().default('public'),
        SKIP_ENV_CHECK: z
                .string()
                .optional()
                .transform((v) => v === 'true' || v === '1'),
});

declare global {
        // eslint-disable-next-line @typescript-eslint/no-namespace
        namespace NodeJS {
                // eslint-disable-next-line @typescript-eslint/no-empty-object-type
                interface ProcessEnv extends z.infer<typeof envSchema> {}
        }
}

export function validateEnv() {
        const parsed = envSchema.safeParse(process.env);
        if (!parsed.success) {
                logError('Invalid environment variables:');
                for (const issue of parsed.error.issues) {
                        logError(`  - ${issue.path.join('.')}: ${issue.message}`);
                }
                if (process.env.NODE_ENV === 'production') {
                        // round90-F6: append the per-issue Arabic messages so the throw
                        // itself carries the cause (was a bare English 'Environment
                        // validation failed' — the details only went to logs)
                        const details = parsed.error.issues
                                .map((i) => `${i.path.join('.')}: ${i.message}`)
                                .join(' | ');
                        throw new Error(`فشل التحقق من متغيرات البيئة — ${details}`);
                }
                logWarn('Using partial defaults in development');
                return envSchema.partial().parse(process.env);
        }
        return parsed.data;
}
