import { del } from '@vercel/blob';

/** Host suffix of this account's Vercel Blob store. */
const BLOB_HOST_SUFFIX = '.vercel-storage.com';

/**
 * Tenant marker introduced in round86-A3: uploads land under
 * `restaurants/{id}/…` (owners) or `staff/…` (admins) so deletion can be
 * scoped per tenant. Legacy flat URLs carry no marker and stay deletable.
 */
const TENANT_PREFIX_RE = /^\/restaurants\/(\d+)\//;

/** Media URL schemes accepted for storage (mirrors the client-side regex). */
const MEDIA_URL_RE = /^(https?:\/\/|data:image\/)/i;

/** True when the URL is an https URL on THIS account's blob store. */
export function isManagedBlobUrl(url: unknown): url is string {
    if (typeof url !== 'string' || !url.startsWith('https://')) return false;
    try {
        return new URL(url).hostname.endsWith(BLOB_HOST_SUFFIX);
    } catch {
        return false;
    }
}

/**
 * Best-effort deletion of a blob URL. Never throws.
 *
 * round86-A3 tenant guard: only ever deletes blobs on this account's store,
 * and — for URLs carrying the `restaurants/{id}/` marker — only when the id
 * matches the acting tenant. Foreign URLs and cross-tenant assets are
 * skipped, so a tenant can no longer weaponize the replace/delete path to
 * remove another tenant's CDN assets.
 */
export async function deleteBlob(
    url: string | null | undefined,
    scope?: { restaurantId?: number }
): Promise<void> {
    if (!isManagedBlobUrl(url)) return;
    try {
        const pathname = new URL(url).pathname;
        const m = TENANT_PREFIX_RE.exec(pathname);
        if (m && scope?.restaurantId !== undefined && Number(m[1]) !== scope.restaurantId) {
            return; // cross-tenant asset — refuse to delete
        }
        await del(url);
    } catch {
        /* best effort */
    }
}

/**
 * round86-A3/A6 write-side guard: media values must be http(s) or data:image
 * (kills `javascript:`-style payloads), and blob URLs marked for another
 * tenant must not be stored (prevents the swap-delete replay).
 * Returns an Arabic error message, or null when the value is acceptable.
 */
export function mediaUrlError(url: unknown, tenantId?: number): string | null {
    if (url === undefined || url === null || url === '') return null;
    if (typeof url !== 'string') return 'قيمة الصورة غير صالحة';
    if (!MEDIA_URL_RE.test(url)) return 'رابط الصورة غير صالح';
    if (isManagedBlobUrl(url) && tenantId !== undefined) {
        try {
            const m = TENANT_PREFIX_RE.exec(new URL(url).pathname);
            if (m && Number(m[1]) !== tenantId) return 'رابط الصورة ينتمي إلى مطعم آخر';
        } catch {
            return 'رابط الصورة غير صالح';
        }
    }
    return null;
}
