"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toArabicNumber } from "@/lib/format";

export default function PlanUsageBadge({ restaurantId }: { restaurantId: number }) {
  const [usage, setUsage] = useState<{ current: number; max: number; planName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [restData, statsData] = await Promise.all([
          fetch(`/api/restaurants/${restaurantId}`).then((r) => {
            if (!r.ok) throw new Error("فشل في تحميل بيانات المطعم");
            return r.json();
          }),
          fetch(`/api/stats?restaurantId=${restaurantId}`).then((r) => {
            if (!r.ok) throw new Error("فشل في تحميل الإحصائيات");
            return r.json();
          }),
        ]);

        if (cancelled) return;

        const rest = restData.data ?? restData;
        const stats = statsData.data ?? statsData;

        setUsage({
          current: stats.totalItems || 0,
          max: rest.maxItems || 50,
          planName: rest.plan?.nameAr || "مجاني",
        });
        setError(null);
      } catch {
        if (!cancelled) {
          setError("تعذر تحميل بيانات الاستخدام");
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [restaurantId]);

  if (error) {
    return (
      <div className="rounded-2xl p-4 border border-red-200/30 bg-red-50/50 dark:bg-red-950/10">
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="size-3" /> {error}
        </p>
      </div>
    );
  }

  if (!usage) return null;

  const pct = Math.min(100, Math.round((usage.current / usage.max) * 100));
  const isNear = usage.current >= usage.max * 0.8;
  const isAt = usage.current >= usage.max;

  return (
    <div className={cn("rounded-2xl p-4 border transition-all", isAt ? "bg-red-50 dark:bg-red-950/20 border-red-200/30" : isNear ? "bg-orange/[0.06] dark:bg-orange/10 border-orange/20" : "bg-card/50 border-border/30")}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{usage.planName}</span>
          <span className="text-muted-foreground">ـ</span>
          <span className={cn("tabular-nums", isAt ? "text-destructive font-bold" : isNear ? "text-orange" : "")}>
            {toArabicNumber(usage.current)} / {usage.max === 9999 ? "∞" : toArabicNumber(usage.max)}
          </span>
          <span className="text-muted-foreground text-xs">صنف</span>
        </div>
        {isAt && (
          <Link href="/pricing">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange to-orange/80 text-orange-foreground text-xs font-medium shadow-lg shadow-orange/20 hover:opacity-90">
              <Crown className="size-3" /> ترقية
            </button>
          </Link>
        )}
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            isAt ? "bg-destructive" : isNear ? "bg-orange" : "bg-gradient-to-r from-orange to-orange/80"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isAt && (
        <p className="text-xs text-destructive mt-2 flex items-center gap-1">
          <AlertTriangle className="size-3" /> وصلت للحد الأقصى. قم بترقية خطتك.
        </p>
      )}
    </div>
  );
}
