"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Navigation progress bar — shows briefly on route change */
function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5">
      <div
        className={cn(
          "h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-all duration-500 ease-out",
          loading ? "w-full opacity-100" : "w-0 opacity-0",
        )}
      />
    </div>
  );
}

/** Scroll-to-top button */
function ScrollButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-24 end-6 z-50 size-11 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:scale-105 transition-all duration-300 flex items-center justify-center",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
      )}
      aria-label="العودة للأعلى"
    >
      <ChevronUp className="size-5" />
    </button>
  );
}

export default function ScrollToTop() {
  return (
    <Suspense fallback={null}>
      <ProgressBar />
      <ScrollButton />
    </Suspense>
  );
}
