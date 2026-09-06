import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { success, error, handleError, parsePagination } from '@/lib/api-helpers';
import { requireAdmin } from '@/lib/auth';
import type { Prisma } from '@/generated/prisma/client';
import { AuditAction } from '@/generated/prisma/client';
import { createDbRateLimiter } from '@/lib/rate-limit';

const auditLogLimiter = createDbRateLimiter({ windowMs: 60_000, max: 30 });

export async function GET(request: NextRequest) {
	try {
		const ip =
			request.headers.get('x-real-ip') ||
			request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
			'unknown';
		const { success: allowed } = await auditLogLimiter.check(`audit-logs:${ip}`);
		if (!allowed) return error('محاولات كثيرة جداً. حاول لاحقاً.', 429);

		const auth = await requireAdmin();
		if (!auth.authorized) return error('غير مصرح', 401);
		// Audit logs expose IPs + actions of ALL users — super_admin only.
		if (auth.role !== 'super_admin') return error('لا تملك الصلاحية', 403);

		const url = new URL(request.url);
		const { searchParams } = url;
		const { page, pageSize } = parsePagination(url, { pageSize: 20 });
		const action = searchParams.get('action');
		// round88-B4: both filters feed enum/int columns — garbage values used
		// to surface as caught Prisma validation noise (action) or be silently
		// dropped (actorId's NaN is falsy). Reject explicitly.
		if (action !== null && !['login', 'create', 'update', 'delete', 'export', 'other'].includes(action)) {
			return error('قيمة فلتر الحدث غير صالحة', 400);
		}
		const actorIdRaw = searchParams.get('actorId');
		const actorId = actorIdRaw ? Number(actorIdRaw) : undefined;
		if (actorId !== undefined && (!Number.isInteger(actorId) || actorId <= 0)) {
			return error('معرف الفاعل غير صالح', 400);
		}
		const targetType = searchParams.get('targetType');
		const search = searchParams.get('search');

		const where: Prisma.AuditLogWhereInput = {};
		if (action) where.action = action as AuditAction;
		if (targetType) where.targetType = targetType;
		if (actorId) where.actorId = actorId;
		if (search?.trim()) {
			where.OR = [
				{ targetType: { contains: search.trim(), mode: 'insensitive' } },
				{ ip: { contains: search.trim(), mode: 'insensitive' } },
			];
		}

		const [data, total] = await Promise.all([
			prisma.auditLog.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * pageSize,
				take: pageSize,
				include: {
					actor: { select: { id: true, name: true, username: true } },
				},
			}),
			prisma.auditLog.count({ where }),
		]);

		return success({ data, total, page, pageSize });
	} catch (e) {
		return handleError(e);
	}
}
