import { del } from '@vercel/blob';

/** Best-effort deletion of a blob URL. Never throws. */
export async function deleteBlob(url: string | null | undefined): Promise<void> {
	if (!url || typeof url !== 'string' || !url.startsWith('https://')) return;
	try {
		await del(url);
	} catch {
		/* best effort */
	}
}
