"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Star, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/actions/review";
import { LottieAnimation } from "@/components/shared/LottieAnimation";

type ReviewDialogProps = {
  menuItemId: number;
  menuItemName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ReviewDialog({
  menuItemId,
  menuItemName,
  open,
  onOpenChange,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setRating(0);
    setComment("");
    setCustomerName("");
    setCustomerPhone("");
    setSubmitting(false);
    setSubmitted(false);
    setError("");
  }, []);

  const handleSubmit = async () => {
    if (rating < 1) return;
    setSubmitting(true);
    setError("");

    try {
      const form = new FormData();
      form.set("menuItemId", String(menuItemId));
      form.set("rating", String(rating));
      form.set("comment", comment);
      form.set("customerName", customerName);
      form.set("customerPhone", customerPhone);
      await submitReview(form);
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o && !submitting) {
      onOpenChange(o);
      if (!submitted) reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden rounded-md">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Star className="size-4 text-amber-400 fill-amber-400" />
            تقييم {menuItemName}
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="p-10 text-center animate-scale-in">
            <div className="size-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4 relative">
              <LottieAnimation src="/animations/restaurant-loading.lottie" autoplay loop={false} speed={2} className="absolute inset-0 size-full" />
            </div>
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
              className="text-lg font-bold mb-1"
            >
              شكراً لتقييمك!
            </motion.p>
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-muted-foreground"
            >
              تم حفظ تقييمك بنجاح
            </motion.p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Stars */}
            <div className="text-center space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                كيف كانت تجربتك مع هذا الصنف؟
              </p>
              <div className="flex justify-center">
                <StarRating value={rating} onChange={setRating} size="lg" />
              </div>
              {rating > 0 && (
                <p className="text-xs text-muted-foreground animate-fade-in">
                  {["", "سيء", "مقبول", "جيد", "جيد جداً", "ممتاز"][rating]}
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="اكتب تعليقاً (اختياري)..."
                maxLength={500}
                rows={3}
                className="w-full rounded-sm border border-input bg-transparent px-4 py-3 text-sm outline-none transition-all focus-visible:border-orange focus-visible:ring-4 focus-visible:ring-orange/20 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1 text-start">
                {comment.length}/500
              </p>
            </div>

            {/* Customer info — optional */}
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="الاسم (اختياري)"
                maxLength={50}
                className="h-11 rounded-sm border border-border/30 bg-card/50 px-4 text-sm outline-none focus-visible:border-orange"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="رقم الهاتف (اختياري)"
                maxLength={20}
                dir="ltr"
                className="h-11 rounded-sm border border-border/30 bg-card/50 px-4 text-sm outline-none focus-visible:border-orange text-left"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-sm">
                {error}
              </p>
            )}

            <Button
              className="w-full h-12 gap-2 text-base"
              onClick={handleSubmit}
              disabled={rating < 1 || submitting}
            >
              {submitting ? (
                <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
