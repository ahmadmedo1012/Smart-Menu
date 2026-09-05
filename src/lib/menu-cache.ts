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
 * TTL still bounds staleness on failure.
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
