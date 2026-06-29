"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toArabicNumber } from "@/lib/format";

type Review = {
  id: number;
  rating: number;
  comment: string;
  customerName: string;
  createdAt: string;
};

type ReviewSheetProps = {
  menuItemId: number;
  menuItemName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ReviewSheet({ menuItemId, menuItemName, open, onOpenChange }: ReviewSheetProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ avgRating: number | null; totalCount: number }>({ avgRating: null, totalCount: 0 });
  const [filterStar, setFilterStar] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !menuItemId) return;
    setLoading(true);
    const params = filterStar ? `?minRating=${filterStar}` : "";
    fetch(`/api/items/${menuItemId}/reviews${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setReviews(json.data);
          if (!filterStar) setStats(json.stats);
        }
      })
      .finally(() => setLoading(false));
  }, [open, menuItemId, filterStar]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-50 max-h-[85vh] rounded-t-2xl bg-card border border-border/30 shadow-2xl flex flex-col overflow-hidden"
            dir="rtl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border/20">
              <div>
                <h3 className="text-base font-bold">تقييمات {menuItemName}</h3>
                {stats.totalCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="text-amber-500 font-bold">{stats.avgRating?.toFixed(1)}</span> ⭐ · {toArabicNumber(stats.totalCount)} تقييم
                  </p>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="size-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Star filter */}
            <div className="flex gap-1.5 px-5 py-3 border-b border-border/10 overflow-x-auto">
              {[null, 5, 4, 3, 2, 1].map((star) => (
                <button
                  key={star ?? "all"}
                  onClick={() => setFilterStar(star)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                    filterStar === star
                      ? "bg-orange text-white border-orange shadow-sm"
                      : "bg-muted/30 text-muted-foreground border-border/20 hover:bg-muted/50",
                  )}
                >
                  {star ? `${star} ⭐` : "الكل"}
                </button>
              ))}
            </div>

            {/* Reviews list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="size-6 rounded-full border-2 border-border border-t-orange animate-spin" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-10">
                  <MessageCircle className="size-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">لا توجد تقييمات{filterStar ? ` بتقييم ${filterStar} نجوم` : ""}</p>
                </div>
              ) : (
                reviews.map((review, i) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="pb-4 border-b border-border/10 last:border-0"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn("size-3", s <= review.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20")}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {review.customerName || "مجهول"} · {new Date(review.createdAt).toLocaleDateString("ar-LY")}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-foreground/80 leading-relaxed">{review.comment}</p>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
