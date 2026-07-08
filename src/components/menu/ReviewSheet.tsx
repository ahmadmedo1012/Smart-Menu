"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toArabicNumber } from "@/lib/format";
import { premiumToast } from "@/lib/premium-toast";

const starAnimate = { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] };

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
  const [fetchError, setFetchError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Submit form state
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState("");
  const [formName, setFormName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open || !menuItemId) return;
    const abort = new AbortController();
    setFetchError(false);
    setLoading(true);
    const params = filterStar ? `?minRating=${filterStar}` : "";
    fetch(`/api/items/${menuItemId}/reviews${params}`, { signal: abort.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setReviews(json.data);
          if (!filterStar) setStats(json.stats);
        }
      })
      .catch(() => {
        setFetchError(true);
        premiumToast("error", "فشل تحميل التقييمات", "تأكد من اتصالك بالإنترنت وحاول مرة أخرى");
      })
      .finally(() => setLoading(false));

    return () => abort.abort();
  }, [open, menuItemId, filterStar, retryKey]);

  async function handleSubmit() {
    if (formRating < 1) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/items/${menuItemId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: formRating, comment: formComment, customerName: formName }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إرسال التقييم");

      // Optimistic: prepend review & update stats
      setReviews((prev) => [json.data, ...prev]);
      setStats((prev) => ({
        avgRating: prev.avgRating
          ? (prev.avgRating * prev.totalCount + formRating) / (prev.totalCount + 1)
          : formRating,
        totalCount: prev.totalCount + 1,
      }));
      setFormRating(0);
      setFormComment("");
      setFormName("");
      premiumToast("star", "شكراً لتقييمك!", "تم إضافة تقييمك بنجاح");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "فشل إرسال التقييم");
    } finally {
      setSubmitting(false);
    }
  }

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
            role="dialog"
            aria-modal="true"
            aria-label={menuItemName}
            onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
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
                    <span className="text-amber-500 font-bold">{toArabicNumber(stats.avgRating?.toFixed(1) ?? "0")}</span> ⭐ · {toArabicNumber(stats.totalCount)} تقييم
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

            {/* Submit form */}
            <div className="border-b border-border/10 px-5 py-4 space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase">أضف تقييمك</h4>
              {/* Star picker */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <motion.button
                    key={s}
                    whileTap={{ scale: 1.3 }}
                    animate={formRating >= s ? starAnimate : {}}
                    transition={{ duration: 0.3 }}
                    onClick={() => { setFormRating(s); setSubmitError(""); }}
                    aria-label={"تقييم " + s + " نجوم"}
                    className={cn(
                      "transition-colors cursor-pointer",
                      s <= formRating ? "text-amber-400" : "text-muted-foreground/20 hover:text-amber-300/50",
                    )}
                  >
                    <Star className={cn("size-6", s <= formRating && "fill-amber-400")} />
                  </motion.button>
                ))}
              </div>
              {/* Comment */}
              <textarea
                placeholder="اكتب تعليقك (اختياري)"
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full rounded-lg border border-border/20 bg-muted/20 p-2.5 text-xs placeholder:text-muted-foreground/40 resize-none outline-none focus-visible:border-orange/50 transition-colors"
              />
              {/* Name */}
              <input
                placeholder="الاسم (اختياري)"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={50}
                className="w-full rounded-lg border border-border/20 bg-muted/20 p-2.5 text-xs placeholder:text-muted-foreground/40 outline-none focus-visible:border-orange/50 transition-colors"
              />
              {/* Error */}
              {submitError && <p className="text-xs text-red-500">{submitError}</p>}
              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={formRating < 1 || submitting}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
                  formRating < 1
                    ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed"
                    : "bg-orange text-white shadow-sm hover:shadow-md active:scale-[0.97]",
                )}
              >
                {submitting ? (
                  <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <Send className="size-3.5" />
                    إرسال التقييم
                  </>
                )}
              </button>
            </div>

            {/* Reviews list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="size-6 rounded-full border-2 border-border border-t-orange animate-spin" />
                </div>
              ) : fetchError ? (
                <div className="text-center py-10">
                  <MessageCircle className="size-8 text-destructive/50 mx-auto mb-3" />
                  <p className="text-sm text-destructive mb-3">فشل تحميل التقييمات. تحقق من اتصالك بالإنترنت.</p>
                  <button
                    onClick={() => setRetryKey((k) => k + 1)}
                    className="text-xs text-orange underline underline-offset-2 hover:no-underline"
                  >
                    إعادة المحاولة
                  </button>
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
