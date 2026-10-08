"use client";

import { useEffect, useState, useCallback } from "react";
import { m } from "motion/react";
import AnimatedStar from '@/components/ui/star-icon';
import { MessageCircle, Trash2 } from 'lucide-react';
import { MotionArrowRight } from '@/components/ui/motion-icons';
import AnimatedRefreshCw from '@/components/ui/refresh-icon';
import { cn } from "@/lib/utils";
import { toArabicNumber, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';
import { useRouter } from "next/navigation";
import { useActiveRestaurant } from "@/components/owner/useActiveRestaurant";
import { csrfJson } from "@/lib/csrf-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { premiumToast } from "@/lib/premium-toast";
import { error as logError } from '@/lib/logger';

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
  const { activeId } = useActiveRestaurant();
  const [reviews, setReviews] = useState<ReviewWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStar, setFilterStar] = useState<number | null>(null);
  // r103-F5b: moderation — remove spam/abusive reviews (the API contract is
  // owner-scoped DELETE /api/items/[id]/reviews?reviewId=N).
  const [deleteTarget, setDeleteTarget] = useState<ReviewWithItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  // round87-C5: server-computed stats (full set, unfiltered) — shape from
  // the paginated() extras field
  const [stats, setStats] = useState<{ total: number; avg: number; distribution: { star: number; count: number }[] }>({
    total: 0,
    avg: 0,
    distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 })),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // round87-C5: pageSize=100 so the list covers the whole tenant set (was the
      // server default 50 with no pagination UI — silently truncated)
      params.set("pageSize", "100");
      if (filterStar) params.set("minRating", String(filterStar));
      if (activeId) params.set("restaurantId", String(activeId));
      const res = await fetch(`/api/owner/reviews?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReviews(json.data);
        // round87-C5: stats come from the server (computed over the FULL set,
        // not the star-filtered first page) via the paginated() extras field
        if (json.stats) setStats(json.stats);
      }
      else setError("تعذر تحميل التقييمات — حاول مجدداً");
    } catch { logError("Failed to load reviews"); setError("تعذر تحميل التقييمات — تحقق من الاتصال وحاول مجدداً"); } finally { setLoading(false); }
  }, [filterStar, activeId]);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // csrfJson throws on non-2xx with the server's Arabic error message
      await csrfJson(`/api/items/${deleteTarget.menuItem.id}/reviews?reviewId=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      premiumToast('success', 'تم حذف التقييم');
      setDeleteTarget(null);
      load();
    } catch (e) {
      premiumToast('error', getErrorMessage(e, 'فشل حذف التقييم'));
    } finally {
      setDeleting(false);
    }
  };

  // round87-C5: the server already applies minRating — the old client-side
  // re-filter was a duplicate of server logic (dual maintenance)
  const filtered = reviews;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/owner")} className="mb-2">
        <MotionArrowRight className="size-4 me-1" />
        العودة
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-normal">التقييمات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة تقييمات العملاء للأصناف
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <AnimatedRefreshCw className={cn("size-4", loading && "animate-spin")} />
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
          <p className="text-3xl font-bold mt-1 text-ember dark:text-saffron">
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
                    className="h-full rounded-full bg-saffron transition-[width] duration-cinema"
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
              "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              filterStar === star
                ? "bg-orange text-orange-foreground border-orange shadow-sm"
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
          <LoadingAnnouncer loading={true} message="جارٍ تحميل التقييمات..." />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-md bg-card/30 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <AnimatedRefreshCw className="size-10 text-destructive/40 mx-auto mb-3" />
          <p className="text-base font-medium text-destructive">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-foreground hover:underline underline-offset-4"
          >
            <AnimatedRefreshCw className="size-3.5" />
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* round88-E3: unified EmptyState — same copy as before, shared visual
           language with the rest of the app (task-named surface: تقييمات). */
        <EmptyState
          icon={MessageCircle}
          title="لا توجد تقييمات"
          description={
            filterStar
              ? "لا توجد تقييمات بهذا عدد النجوم — جرّب تصفية أخرى"
              : "عندما يقوم العملاء بتقييم الأصناف ستظهر هنا"
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((review, i) => (
            <m.div
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
                        /* round94 (D/A3): نمط r84 نفسه — saffron غير المحروس كان 2.05:1 في الفاتح */
                        <AnimatedStar key={s} className={cn("size-3.5", s <= review.rating ? "text-ember dark:text-saffron fill-ember dark:fill-saffron" : "text-muted-foreground/20")} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {review.customerName || "مجهول"}
                    </span>
                  </div>
                  <p className="text-xs text-accent-foreground/70 font-medium mb-1">
                    {review.menuItem.nameAr || review.menuItem.name}
                  </p>
                  {review.comment && (
                    <p className="text-sm text-foreground/70 leading-relaxed">{review.comment}</p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {formatDateShort(new Date(review.createdAt))}
                  </span>
                  {/* r103-F5b: moderation — 44px touch target (size-11) per the
                      same rule the web round r102-W2 enforced elsewhere */}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(review)}
                    aria-label={`حذف تقييم ${review.customerName || 'مجهول'}`}
                    className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      )}

      {/* Delete confirmation (r103-F5b) */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف التقييم</DialogTitle>
            <DialogDescription>
              سيُحذف تقييم {deleteTarget?.customerName || "مجهول"} ({toArabicNumber(deleteTarget?.rating ?? 0)} ⭐) على «{deleteTarget?.menuItem.nameAr || deleteTarget?.menuItem.name}»
              نهائياً وسيُعاد حساب متوسط التقييم. هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>إلغاء</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <AnimatedRefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              حذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
