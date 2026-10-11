/**
 * r143 (Phase-4 W1 D1/D3) — image URL normalization at the next/image
 * optimizer boundary (src/lib/image-url.ts).
 *
 * The live demo shipped a broken core item («شاي» → HTTP 400): the stored
 * URL already carried pre-baked imgix params (`?w=400&q=85` — the demo seed
 * wrote them) and next/image appended its OWN `&w=…&q=…`, so the upstream
 * CDN saw duplicated sizing params — a hard 400 on some photos, a ~200px
 * source for a 478px slot on the rest (the measured 2.1× upscale).
 * The optimizer must own ALL sizing params; stored URLs are bare asset URLs.
 */
import { describe, it, expect } from 'vitest';
import { stripRemoteImageQuery } from '@/lib/image-url';

describe('stripRemoteImageQuery', () => {
        it('strips the pre-baked sizing params (the exact شاي production case)', () => {
                expect(
                        stripRemoteImageQuery('https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&q=85')
                ).toBe('https://images.unsplash.com/photo-1571934811356-5cc061b6821f');
        });

        it('bare remote URLs pass through byte-identical', () => {
                expect(stripRemoteImageQuery('https://images.unsplash.com/photo-1509042239860-f550ce710b93')).toBe(
                        'https://images.unsplash.com/photo-1509042239860-f550ce710b93'
                );
        });

        it('data URLs are never sliced (a ? inside them carries real content)', () => {
                const dataUrl = 'data:image/webp;base64,UklGRh4A?not=imgix';
                expect(stripRemoteImageQuery(dataUrl)).toBe(dataUrl);
        });

        it('app-local paths (/demo/*.webp, /_next/…) pass through untouched', () => {
                expect(stripRemoteImageQuery('/demo/tea.webp?v=8')).toBe('/demo/tea.webp?v=8');
                expect(stripRemoteImageQuery('/_next/static/media/logo.svg')).toBe('/_next/static/media/logo.svg');
        });

        it('http:// remote URLs are normalized too (not just https)', () => {
                expect(stripRemoteImageQuery('http://example.com/img.png?w=100')).toBe('http://example.com/img.png');
        });
});
