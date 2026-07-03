# Upload Pipeline Overhaul — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal**: Fix "بيانات غير صالحة" toast by compressing images client-side, exposing error details, and adding Zod guards.

**Architecture**: Canvas-based client-side compression keeps binary < 400KB → base64 < 550KB → safely under Vercel 4.5MB limit. Error `details` array parsed and displayed. Zod `.max()` guard catches oversized strings at the API layer.

**Tech Stack**: Next.js 16, React 19, Zod, canvas API

## Global Constraints

- Zero new dependencies — canvas API, no libs
- Arabic-first error messages
- Follow existing code patterns (csrfFetch, premiumToast, cn)

---

### Task 1: API Shims — Fix error message + Zod max constraints

**Files:**
- Modify: `src/app/api/upload/route.ts:12`
- Modify: `src/app/api/items/route.ts:15`
- Modify: `src/app/api/items/[id]/route.ts:16`

- [ ] **1a: Fix error message mismatch in upload route**

`src/app/api/upload/route.ts` line 12 — `"10MB"` → `"5MB"` to match `MAX_SIZE`:

```ts
.refine((f) => f.size <= MAX_SIZE, "الملف كبير جداً (الحد الأقصى 5MB)"),
```

- [ ] **1b: Add max length to image field in createSchema**

`src/app/api/items/route.ts` line 15 — add `.max(7000000)`:

```ts
image: z.string().max(7000000).optional(),
```

- [ ] **1c: Add max length to image field in updateSchema**

`src/app/api/items/[id]/route.ts` line 16 — same change:

```ts
image: z.string().max(7000000).optional(),
```

- [ ] **1d: Commit**

```bash
git add src/app/api/upload/route.ts src/app/api/items/route.ts src/app/api/items/\[id\]/route.ts
git commit -m "fix: align upload error msg (10MB→5MB), add Zod max(7M) on image field"
```

---

### Task 2: Client-Side Compression + Error Details

**Files:**
- Modify: `src/components/owner/ItemDialog.tsx`

**Interfaces:**
- Consumes: `csrfFetch` from `@/lib/csrf-client`, `premiumToast` from `@/lib/premium-toast`
- Produces: compressed image blob → FormData → POST `/api/upload` → data URL → form state

- [ ] **2a: Add compressImage utility function**

Before the component (after line 18, before `export default`):

```tsx
/** Compress image to max 1200px, quality 0.7 — keeps payload under Vercel 4.5MB limit */
function compressImage(file: File, maxDim = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('فشل ضغط الصورة')), 'image/jpeg', quality);
    };
    img.onerror = () => reject(new Error('فشل قراءة الصورة'));
    img.src = URL.createObjectURL(file);
  });
}
```

- [ ] **2b: Update file input onChange to use compression + parse details**

Replace lines 81-87 (the `onChange` handler inside `<input type="file">`) with:

```tsx
<input type="file" accept="image/*" className="hidden" onChange={async e => {
  const file = e.target.files?.[0]; if (!file) return;
  setUploading(true);
  premiumToast("info", "جاري رفع ومعالجة الصورة...");
  try {
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append("file", compressed, file.name.replace(/\.[^.]+$/, '.jpg'));
    const r = await csrfFetch("/api/upload", { method: "POST", body: fd });
    const d = await r.json();
    if (!r.ok) {
      const detail = d?.details?.length ? ` — ${d.details.join('; ')}` : '';
      premiumToast("error", `${d?.error || 'فشل رفع الصورة'}${detail}`);
      return;
    }
    if (d.data?.url) setForm({...form, image: d.data.url});
    else premiumToast("error", "فشل رفع الصورة");
  } catch (e) {
    premiumToast("error", e instanceof Error ? e.message : "فشل رفع الصورة");
  } finally { setUploading(false); }
}} disabled={uploading} />
```

- [ ] **2c: Update save catch block to show details**

Replace lines 48-52 (`try { const e = ... }` block inside save):

```tsx
      if (!res.ok) {
        let errMsg = "فشل الحفظ";
        try {
          const e = await res.json();
          errMsg = e?.error || errMsg;
          if (e?.details?.length) errMsg += ' — ' + e.details.join('; ');
        } catch {}
        throw new Error(errMsg);
      }
```

- [ ] **2d: Commit**

```bash
git add src/components/owner/ItemDialog.tsx
git commit -m "feat: client-side image compression + detailed error toasts

- Canvas resize to 1200px at 0.7 quality
- Error details array parsed and shown in toast
- Inputs locked during upload (uploading state)"
```

---

### Task 3: Verify — lint + build

- [ ] **3a: Run lint**

```bash
npm run lint
```
Expected: no errors or warnings.

- [ ] **3b: Run build**

```bash
npm run build
```
Expected: successful build, no errors.
