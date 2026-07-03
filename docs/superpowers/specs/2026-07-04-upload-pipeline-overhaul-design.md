# Upload Pipeline Overhaul — Design Doc

**Date**: 2026-07-04
**Project**: Smart Menu
**Status**: Approved

## Problem

Image uploads fail with generic "بيانات غير صالحة" toast. Root cause: base64 data URLs inflate binary by ~33%. A 3.8MB phone photo becomes ~5MB base64, then ~5.3MB in JSON body → exceeds Vercel serverless 4.5MB payload limit → `request.json()` throws → `handleError` catches → generic error. Client never sees the `details` array with the actual field error.

## Solution

Three-pronged approach: compress client-side, expose error details, align config.

### 1. Client-Side Image Compression (ItemDialog.tsx)

Add canvas-based image resize before FormData upload:
- Max dimension: 1200px (maintains aspect ratio)
- JPEG quality: 0.7
- Keeps binary under ~400KB → base64 under ~550KB → safely under all limits
- No new dependencies — uses `canvas` API via `document.createElement('canvas')`
- Compression runs after file selection, during `uploading = true`

### 2. Hardened Error Transparency

- **ItemDialog.tsx**: parse `details` array from error response `{ error, details }`, show in toast
- **api-helpers.ts**: `validationError()` already returns `details` array — no change needed
- **upload/route.ts**: fix error message mismatch — `"10MB"` → `"5MB"` to match `MAX_SIZE`

### 3. Zod Guard Rails

- **items/route.ts & items/[id]/route.ts**: add `.max(7000000)` to `image: z.string().optional()` — fail early if a base64 string somehow exceeds 7MB

## Files Changed

| File | Change |
|------|--------|
| `src/components/owner/ItemDialog.tsx` | Add image compression fn, parse `details` in catch, lock inputs during upload |
| `src/app/api/upload/route.ts` | Fix error message "10MB" → "5MB" |
| `src/app/api/items/route.ts` | Add `image: z.string().max(7000000).optional()` |
| `src/app/api/items/[id]/route.ts` | Same max constraint |

## Not Changed (Explicitly Skipped)

- **next.config.ts**: Vercel serverless payload limit is a platform constraint, not code-configurable for API routes. Compression makes this irrelevant.
- **api-helpers.ts**: Already returns `details` array. No change needed.
- **Base64→S3 migration**: Out of scope. If DB size becomes an issue, migrate to cloud storage then.
- **Upload progress bar (bytes)**: Overengineering for now. Spinner + "جاري رفع ومعالجة الصورة..." is sufficient.
- **Dropzone, multi-upload, gallery reorder**: Not requested. YAGNI.

## Client-Side Compression Implementation

```ts
function compressImage(file: File, maxDim = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const [w, h] = img.width > img.height
        ? [maxDim, (img.height / img.width) * maxDim]
        : [(img.width / img.height) * maxDim, maxDim];
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Compression failed')), 'image/jpeg', quality);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
```

Binary shrinks ~8-20x. A 4000×3000 phone photo (~4MB JPEG) → 1200×900 at 0.7 → ~200-400KB. Well under all limits.

## Error Display

Current catch block:
```ts
try { const e = await res.json(); errMsg = e?.error || errMsg; } catch {}
```

Updated:
```ts
try {
  const e = await res.json();
  errMsg = e?.error || errMsg;
  if (e?.details?.length) errMsg += ' — ' + e.details.join('; ');
} catch {}
```

User sees: "فشل الحفظ — image: قيمة طويلة جداً" instead of opaque "بيانات غير صالحة".
