import { z } from 'zod';

const envSchema = z.object({
	DATABASE_URL: z.string().min(1, 'DATABASE_URL مطلوب — يجب تعيين رابط قاعدة البيانات'),
	JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
	NEXT_PUBLIC_DOMAIN: z.url('NEXT_PUBLIC_DOMAIN مطلوب — رابط الموقع (مثال: https://example.com)'),
	NEXT_PUBLIC_WHATSAPP_NUMBER: z
		.string()
		.min(1, 'NEXT_PUBLIC_WHATSAPP_NUMBER مطلوب — رقم واتساب المطعم الذي يستقبل الطلبات'),
	TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
	TELEGRAM_CHAT_ID: z.string().optional().default(''),
	AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),
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
		console.error('Invalid environment variables:');
		for (const issue of parsed.error.issues) {
			console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
		}
		if (process.env.NODE_ENV === 'production') {
			throw new Error('Environment validation failed');
		}
		console.warn('Using partial defaults in development');
		return envSchema.partial().parse(process.env);
	}
	return parsed.data;
}
