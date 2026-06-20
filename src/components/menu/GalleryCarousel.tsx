"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Maximize2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GalleryCarousel({
  images,
  restaurantName,
}: {
  images: string[];
  restaurantName?: string;
}) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState<Set<number>>(new Set([0]));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setCurrent((prev) => {
      const next = (prev + 1) % images.length;
      setLoaded((s) => new Set(s).add(next));
      return next;
    });
  }, [images.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => {
      const next = (prev - 1 + images.length) % images.length;
      setLoaded((s) => new Set(s).add(next));
      return next;
    });
  }, [images.length]);

  useEffect(() => {
    if (!paused) {
      intervalRef.current = setInterval(next, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [next, paused]);

  if (!images.length) return null;

  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    setLightbox(true);
    setPaused(true);
  };

  const closeLightbox = () => {
    setLightbox(false);
    setPaused(false);
  };

  const goTo = (idx: number) => {
    setCurrent(idx);
    setLoaded((s) => new Set(s).add(idx));
  };

  return (
    <>
      <div className="group relative rounded-2xl overflow-hidden bg-card/50 border border-border/20 shadow-lg">
        <div className="relative aspect-[21/9] md:aspect-[3/1] overflow-hidden">
          {images.map((img, i) => (
            <div
              key={i}
              className={cn(
                "absolute inset-0 transition-all duration-700 ease-out cursor-pointer",
                i === current ? "opacity-100 scale-100" : "opacity-0 scale-105",
              )}
              onClick={() => openLightbox(i)}
            >
              {loaded.has(i) && (
                <img
                  src={img}
                  alt={`${restaurantName || "صورة"} ${i + 1}`}
                  className="w-full h-full object-cover img-fade-in"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/60 backdrop-blur-sm text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-background/80 hover:scale-110 shadow-lg">
              <ChevronRight className="size-4" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/60 backdrop-blur-sm text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-background/80 hover:scale-110 shadow-lg">
              <ChevronLeft className="size-4" />
            </button>

            <button type="button" onClick={(e) => { e.stopPropagation(); setPaused((p) => !p); }}
              className="absolute bottom-3 right-3 size-8 rounded-full bg-background/40 backdrop-blur-sm text-foreground/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-background/70">
              {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button key={i} type="button" onClick={(e) => { e.stopPropagation(); goTo(i); }}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === current ? "w-6 bg-white shadow-md" : "w-1.5 bg-white/40 hover:bg-white/60",
                  )} aria-label={`صورة ${i + 1}`} />
              ))}
            </div>
          </>
        )}

        <button type="button" onClick={(e) => { e.stopPropagation(); openLightbox(current); }}
          className="absolute top-3 left-3 size-8 rounded-full bg-background/40 backdrop-blur-sm text-foreground/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-background/70"
          aria-label="تكبير">
          <Maximize2 className="size-3.5" />
        </button>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center animate-fade-in"
          onClick={closeLightbox}>
          <button type="button" onClick={closeLightbox}
            className="absolute top-4 left-4 size-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all z-10">
            <X className="size-5" />
          </button>

          <div className="relative max-w-5xl max-h-[92vh] mx-4 w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}>
            <img src={images[lightboxIdx]} alt={`${restaurantName || "صورة"} ${lightboxIdx + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl animate-lightbox-scale" />

            {images.length > 1 && (
              <>
                <button type="button"
                  onClick={() => setLightboxIdx((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute -left-4 md:left-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/25 transition-all shadow-lg backdrop-blur-sm">
                  <ChevronRight className="size-5" />
                </button>
                <button type="button"
                  onClick={() => setLightboxIdx((prev) => (prev + 1) % images.length)}
                  className="absolute -right-4 md:right-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/25 transition-all shadow-lg backdrop-blur-sm">
                  <ChevronLeft className="size-5" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, i) => (
                    <button key={i} type="button" onClick={() => setLightboxIdx(i)}
                      className={cn("h-1.5 rounded-full transition-all duration-300",
                        i === lightboxIdx ? "w-5 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50")} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
