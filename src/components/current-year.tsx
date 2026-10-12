"use client";

import { useSyncExternalStore } from "react";

/* r148 (19-AUDIT-CROSS R8) — the build-frozen © year island, the
 * Smart-Link twin (src/components/current-year.tsx, r126/r140) as adapted
 * by Smart-Order (c1dfd2c): the landing footer lived in a Server Component,
 * so new Date().getFullYear() evaluated ONCE at build and went stale between
 * deploys. This island hydrates only the year with the repo's hydration-safe
 * contract:
 *   - the SERVER stamps buildYear (passed by the footer — evaluated at
 *     build; no-JS visitors keep a valid year forever),
 *   - hydration renders the SAME value via getServerSnapshot (zero
 *     mismatch, even across New Year),
 *   - React's post-hydration snapshot check then patches the visitor's
 *     live year if it differs — the only re-render is the one that
 *     matters, and there is no setState-in-effect.
 * The store never emits (subscribe is a no-op): the year is read, not
 * observed. */
const subscribe = () => () => {};

export function CurrentYear({ buildYear }: { buildYear: number }) {
  const year = useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => buildYear
  );
  return <span>{year}</span>;
}
