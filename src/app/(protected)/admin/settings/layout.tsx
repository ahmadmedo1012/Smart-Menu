import type { Metadata } from "next";

/** r131-F4b (F5 completion, A7 — fleet ruling "route titles ar"): per-route
 *  Arabic document title (rides the (protected) template "%s | الربط الذكي").
 *  The page is a client component and can't export metadata, so the segment
 *  gets this transparent server layout (SO r131-F3 pattern). */
export const metadata: Metadata = { title: "الإعدادات" };

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
