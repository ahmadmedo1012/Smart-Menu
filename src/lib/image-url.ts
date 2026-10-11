/**
 * r143 (Phase-4 W1, finding D1/D3) — image URL normalization for the
 * next/image optimizer boundary.
 *
 * The production demo shipped a broken core item («شاي» → HTTP 400 from
 * `/_next/image`): the stored URL already carried pre-baked imgix sizing
 * params (`?w=400&q=85` — the demo seed wrote them), and next/image's
 * optimizer appended its OWN `&w=…&q=…` to the upstream fetch. The
 * duplicated `w`/`q` params make the upstream CDN serve a capped/broken
 * rendition — on some photos a hard 400 (the <img> stays at opacity-0
 * forever), on the rest a ~190-220px source for a 268-478px slot (the
 * measured 1.25×-2.1× upscale on the demo's food photos).
 *
 * The optimizer must own ALL sizing params: a stored URL is the bare asset
 * URL. Render-level is the one choke point that heals every already-stored
 * row (the production DB is out of reach for code fixes), so every consumer
 * of `next/image` for remote media goes through `stripRemoteImageQuery`.
 *
 * Scope guard: ONLY absolute http(s) URLs are touched. Data URLs
 * (`data:image/…` — the ≤200KB compressed-inline path) and app-local paths
 * (`/demo/*.webp`, `/_…`) pass through byte-identical — a `?` in either
 * never carried imgix params, and slicing a data URL at `?` would be a
 * corruption class of its own.
 */
export function stripRemoteImageQuery(src: string): string {
        if (!src.startsWith('https://') && !src.startsWith('http://')) return src;
        const queryStart = src.indexOf('?');
        if (queryStart === -1) return src;
        return src.slice(0, queryStart);
}
