/**
 * Round87-D5 — src/lib/blob.ts tenant-scope guard coverage (was 0% lcov).
 * @vercel/blob's del is mocked — no network, no real store.
 * Guards under test: isManagedBlobUrl (account host), deleteBlob
 * (restaurants/{id}/ tenant marker), mediaUrlError (write-side scheme +
 * cross-tenant rejection).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const delMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@vercel/blob', () => ({ del: delMock }));

import { isManagedBlobUrl, deleteBlob, mediaUrlError } from '@/lib/blob';

const MANAGED = 'https://abcd1234.vercel-storage.com';

beforeEach(() => {
  delMock.mockClear();
});

describe('isManagedBlobUrl', () => {
  it('https URL on this account\'s blob host → true', () => {
    expect(isManagedBlobUrl(`${MANAGED}/img.png`)).toBe(true);
  });

  it('https URL on ANY *.vercel-storage.com host → true (suffix match)', () => {
    expect(isManagedBlobUrl('https://someone-else.vercel-storage.com/img.png')).toBe(true);
  });

  it('https URL on an unrelated host → false', () => {
    expect(isManagedBlobUrl('https://cdn.example.com/img.png')).toBe(false);
  });

  it('plain http (not https) → false', () => {
    expect(isManagedBlobUrl('http://abcd1234.vercel-storage.com/img.png')).toBe(false);
  });

  it('non-string values → false (type-guard narrows to string)', () => {
    expect(isManagedBlobUrl(undefined)).toBe(false);
    expect(isManagedBlobUrl(42)).toBe(false);
    expect(isManagedBlobUrl({ url: `${MANAGED}/x` })).toBe(false);
  });

  it('malformed URL string → false (never throws)', () => {
    expect(isManagedBlobUrl('https://')).toBe(false);
  });
});

describe('deleteBlob — round86-A3 tenant-scoped deletion', () => {
  it('in-tenant blob (restaurants/1/…) with matching scope → del called', async () => {
    const url = `${MANAGED}/restaurants/1/menu/img.png`;

    await deleteBlob(url, { restaurantId: 1 });

    expect(delMock).toHaveBeenCalledWith(url);
  });

  it('cross-tenant blob (restaurants/2/…) against scope 1 → deletion REFUSED', async () => {
    await deleteBlob(`${MANAGED}/restaurants/2/menu/img.png`, { restaurantId: 1 });

    expect(delMock).not.toHaveBeenCalled();
  });

  it('legacy flat blob URL (no tenant marker) stays deletable with a scope', async () => {
    const url = `${MANAGED}/img.png`;

    await deleteBlob(url, { restaurantId: 1 });

    expect(delMock).toHaveBeenCalledWith(url);
  });

  it('tenant-marked URL with NO scope → deletable (admin/cleanup callers)', async () => {
    const url = `${MANAGED}/restaurants/5/menu/img.png`;

    await deleteBlob(url);

    expect(delMock).toHaveBeenCalledWith(url);
  });

  it('non-managed external URL is never deleted', async () => {
    await deleteBlob('https://cdn.example.com/img.png', { restaurantId: 1 });

    expect(delMock).not.toHaveBeenCalled();
  });

  it('null/undefined URL → no-op', async () => {
    await deleteBlob(null);
    await deleteBlob(undefined);

    expect(delMock).not.toHaveBeenCalled();
  });

  it('del throwing is swallowed (best-effort contract — never throws)', async () => {
    delMock.mockRejectedValueOnce(new Error('store down'));

    await expect(
      deleteBlob(`${MANAGED}/restaurants/1/menu/img.png`, { restaurantId: 1 })
    ).resolves.toBeUndefined();
  });
});

describe('mediaUrlError — write-side guard (round86-A3/A6)', () => {
  it('empty-ish values pass (field simply not provided)', () => {
    expect(mediaUrlError(null)).toBeNull();
    expect(mediaUrlError(undefined)).toBeNull();
    expect(mediaUrlError('')).toBeNull();
  });

  it('non-string value → invalid-value message', () => {
    expect(mediaUrlError(42, 1)).toBe('قيمة الصورة غير صالحة');
  });

  it('javascript: scheme is rejected (XSS-shaped payloads)', () => {
    expect(mediaUrlError('javascript:alert(1)')).toBe('رابط الصورة غير صالح');
  });

  it('data:image URLs are accepted', () => {
    expect(mediaUrlError('data:image/png;base64,iVBORw0KGgo=')).toBeNull();
  });

  it('ordinary https URL (non-blob) is accepted', () => {
    expect(mediaUrlError('https://cdn.example.com/img.png', 1)).toBeNull();
  });

  it('managed blob URL in the SAME tenant → accepted', () => {
    expect(mediaUrlError(`${MANAGED}/restaurants/1/menu/img.png`, 1)).toBeNull();
  });

  it('managed blob URL marked for ANOTHER tenant → cross-tenant message (swap-delete replay blocked)', () => {
    expect(mediaUrlError(`${MANAGED}/restaurants/2/menu/img.png`, 1)).toBe(
      'رابط الصورة ينتمي إلى مطعم آخر'
    );
  });

  it('managed blob URL without a tenant marker is accepted even with tenantId set', () => {
    expect(mediaUrlError(`${MANAGED}/img.png`, 1)).toBeNull();
  });

  it('no tenantId given → the cross-tenant branch is skipped entirely', () => {
    expect(mediaUrlError(`${MANAGED}/restaurants/2/menu/img.png`)).toBeNull();
  });
});
