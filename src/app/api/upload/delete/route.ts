import { NextRequest } from 'next/server';
import { del } from '@vercel/blob';
import { requireAuth } from '@/lib/auth';
import { error, success } from '@/lib/api-helpers';

// ponytail: ownership = role + host check. A real per-restaurant ownership table
// would require recording {restaurantId, url} at upload time; add if multi-owner
// tenants (sub-accounts) ever share a restaurant's blob store.
const BLOB_HOSTS = ['public.blob.vercel-storage.com', 'vercel-blob.com', 'blob.vercel-storage.com'];

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error('غير مصرح', 401);

		// Only restaurant owners or admins may delete blobs — regular users have no
		// restaurant assets to clean up and must not be able to delete other tenants' images
		if (auth.role !== 'owner' && auth.role !== 'admin') {
			return error('غير مصرح', 403);
		}

		const { url: blobUrl } = await request.json();
		if (!blobUrl || typeof blobUrl !== 'string') return error('URL مطلوب', 400);

		let host: string;
		try {
			host = new URL(blobUrl).host;
		} catch {
			return error('URL غير صالح', 400);
		}
		if (!BLOB_HOSTS.includes(host)) return error('URL غير صالح', 400);

		await del(blobUrl);
		return success({ deleted: true });
	} catch {
		return success({ deleted: false });
	}
}
