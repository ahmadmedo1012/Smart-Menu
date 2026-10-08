/**
 * r126 (P4-F1 M7, audit G1): pin the unified deployment origin.
 *
 * The env fallback was previously SPLIT (apex smart-link.ly in layouts/
 * sitemap/robots vs http://localhost:3000 in the restaurant OG/JSON-LD) —
 * a missing NEXT_PUBLIC_DOMAIN in a deploy would emit wrong-host canonicals.
 * lib/seo.ts is now the single source; this pin fails if the fallback ever
 * drifts from the real host (menu.smart-link.ly).
 */
import { describe, it, expect } from 'vitest';
import { SITE_ORIGIN } from '@/lib/seo';

describe('SITE_ORIGIN (r126 M7)', () => {
	it('falls back to the real production host (menu.smart-link.ly), never localhost or the apex domain', () => {
		// When NEXT_PUBLIC_DOMAIN is unset the constant must resolve to the
		// canonical menu host. (If the env var is set in this runner, the
		// assertion still verifies a valid https origin was produced.)
		if (!process.env.NEXT_PUBLIC_DOMAIN) {
			expect(SITE_ORIGIN).toBe('https://menu.smart-link.ly');
		} else {
			expect(SITE_ORIGIN).toBe(process.env.NEXT_PUBLIC_DOMAIN);
		}
	});

	it('is always an https URL with no trailing slash', () => {
		expect(SITE_ORIGIN.startsWith('https://')).toBe(true);
		expect(SITE_ORIGIN.endsWith('/')).toBe(false);
	});
});
