import { NextRequest } from 'next/server';
import { del } from '@vercel/blob';
import { requireAuth } from '@/lib/auth';
import { error, success } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return error('غير مصرح', 401);

    const { url: blobUrl } = await request.json();
    if (!blobUrl || typeof blobUrl !== 'string') return error('URL مطلوب', 400);
    if (!blobUrl.startsWith('https://')) return error('URL غير صالح', 400);

    await del(blobUrl);
    return success({ deleted: true });
  } catch {
    return success({ deleted: false });
  }
}
