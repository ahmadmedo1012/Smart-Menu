import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { error as logError } from './logger';

/**
 * round85-B9 — instant ISR purge for the public menu page.
 *
 * /menu/[slug] is cached with revalidate=60 + CDN s-maxage=60. Before this
 * helper, an owner's edit (item/category/setting/restaurant change) was
 * invisible on their own menu for up to a full minute — confusing during live
 * menu work. Mutation routes call this right after a successful write, so an
 * edit is live the moment the dialog closes.
 *
 * Best-effort by design: a purge failure never blocks the mutation — the 60s
 * TTL still bounds staleness on failure. The helper never throws (fully
 * wrapped below), so callers `await` it safely.
 *
 * round92-A2 companion fix — SYNCHRONOUS PUBLISH: call sites now `await`
 * this helper instead of the old fire-and-forget `.catch(() => {})`. Under
 * the pre-r92 accidentally-dynamic rendering the race was invisible (every
 * read hit the DB); once ISR actually engages (round92 generateStaticParams
 * restoration) a fire-and-forget purge lets the client's IMMEDIATE next
 * request (e2e owner→customer round-trips: team8/team11/round79) beat the
 * purge, serve the stale page, and re-cache it for ANOTHER 60s. Awaited, the
 * mutation response returns only after the purge: the next read is fresh,
 * deterministically. Cost: one indexed findUnique (~ms) per mutation.
 */
export async function revalidateMenu(restaurantId: number | null | undefined) {
        try {
                if (!restaurantId) return;
                const restaurant = await prisma.restaurant.findUnique({
                        where: { id: restaurantId },
                        select: { slug: true },
                });
                if (!restaurant?.slug) return;
                revalidatePath(`/menu/${restaurant.slug}`);
        } catch (e) {
                logError('menu revalidate failed', {
                        error: String(e),
                        restaurantId: String(restaurantId ?? ''),
                });
        }
}
