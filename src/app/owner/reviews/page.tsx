"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, MessageCircle, RefreshCw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toArabicNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type ReviewWithItem = {
  id: number;
  rating: number;
  comment: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  menuItem: { id: number; name: string; nameAr: string | null };
};

export default function OwnerReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStar, setFilterStar] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStar ? `?minRating=${filterStar}` : "";
      const res = await fetch(`/api/owner/reviews${params}`);
      const json = await res.json();
      if (json.success) setReviews(json.data);
    } catch {} finally { setLoading(false); }
  }, [filterStar]);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStar ? reviews.filter((r) => r.rating >= filterStar) : reviews;

  const stats = {
    total: reviews.length,
    avg: reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0,
    distribution: [5, 4, 3, 2, 1].map((s) => ({ star: s, count: reviews.filter((r) => r.rating === s).length })),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/owner")} className="mb-2">
        <ArrowRight className="size-4 me-1" />
        العودة
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">التقييمات</h2>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة تقييمات العملاء للأصناف
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          تحديث
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md bg-card/60 border border-border/20 p-4">
          <p className="text-sm text-muted-foreground">إجمالي التقييمات</p>
          <p className="text-3xl font-bold mt-1">{toArabicNumber(stats.total)}</p>
        </div>
        <div className="rounded-md bg-card/60 border border-border/20 p-4">
          <p className="text-sm text-muted-foreground">متوسط التقييم</p>
          <p className="text-3xl font-bold mt-1 text-amber-500">
            {stats.avg > 0 ? stats.avg.toFixed(1) : "---"}
          </p>
        </div>
        <div className="rounded-md bg-card/60 border border-border/20 p-4 col-span-2">
          <p className="text-sm text-muted-foreground mb-2">توزيع التقييمات</p>
          <div className="space-y-1.5">
            {stats.distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-8 shrink-0">{d.star} ⭐</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${stats.total > 0 ? (d.count / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 text-end text-muted-foreground tabular-nums">{toArabicNumber(d.count)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[null, 5, 4, 3, 2, 1].map((star) => (
          <button
            key={star ?? "all"}
            onClick={() => setFilterStar(star)}
            className={cn(
              "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border",
              filterStar === star
                ? "bg-orange text-white border-orange shadow-sm"
                : "bg-card/50 text-muted-foreground border-border/20 hover:bg-muted/50",
            )}
          >
            {star ? `${star} ⭐` : "الكل"}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-md bg-card/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="size-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-base font-medium text-muted-foreground">لا توجد تقييمات</p>
          <p className="text-sm text-muted-foreground/60 mt-1">عندما يقوم العملاء بتقييم الأصناف ستظهر هنا</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-md bg-card/50 border border-border/20 p-4 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={cn("size-3.5", s <= review.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20")} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {review.customerName || "مجهول"}
                    </span>
                  </div>
                  <p className="text-xs text-orange/70 font-medium mb-1">
                    {review.menuItem.nameAr || review.menuItem.name}
                  </p>
                  {review.comment && (
                    <p className="text-sm text-foreground/70 leading-relaxed">{review.comment}</p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString("ar-LY")}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
