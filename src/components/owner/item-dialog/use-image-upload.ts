'use client';
/*
 * item-dialog/use-image-upload.ts — round94 W2-b (inspection-c §2.5):
 * the upload state (179) + the async upload handler body moved VERBATIM from
 * the inline file-input onChange (source 553–576). The single sanctioned
 * replacement: `setForm({ ...form, image: d.data.url })` became
 * `onUploaded(d.data.url)` — the orchestrator wires it to
 * patch({ image: url }) which is a FUNCTIONAL update, closing the stale
 * closure race (old line 569) that used to clobber fields typed during the
 * upload. The `file` existence check stays in the component (ItemImageField).
 */

import { useState } from 'react';
import { csrfFetch } from '@/lib/csrf-client';
import { compressImage } from '@/lib/image-compress';
import { premiumToast } from '@/lib/premium-toast';

export function useImageUpload(onUploaded: (url: string) => void): {
	uploading: boolean;
	/** compressImage → FormData → csrfFetch('/api/upload') → onUploaded(url). */
	uploadFile: (file: File) => Promise<void>;
} {
	const [uploading, setUploading] = useState(false);

	const uploadFile = async (file: File) => {
		setUploading(true);
		premiumToast('info', 'جارٍ رفع ومعالجة الصورة…');
		try {
			const compressed = await compressImage(file);
			const fd = new FormData();
			fd.append('file', compressed, file.name.replace(/\.[^.]+$/, '.jpg'));
			const r = await csrfFetch('/api/upload', { method: 'POST', body: fd });
			const d = await r.json();
			if (!r.ok) {
				const detail = d?.details?.length ? ` — ${d.details.join('; ')}` : '';
				premiumToast('error', `${d?.error || 'تعذّر رفع الصورة'}${detail}`);
				return;
			}
			if (d.data?.url) onUploaded(d.data.url);
			else premiumToast('error', 'تعذّر رفع الصورة');
		} catch (e) {
			premiumToast('error', e instanceof Error ? e.message : 'تعذّر رفع الصورة');
		} finally {
			setUploading(false);
		}
	};

	return { uploading, uploadFile };
}
