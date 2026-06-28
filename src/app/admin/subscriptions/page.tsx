"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { csrfFetch } from "@/lib/csrf-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toArabicNumber } from "@/lib/format";
import {
  CreditCard, Check, X, RefreshCw, FilterX,
  ChevronLeft, ChevronRight, AlertCircle, Smartphone, Clock,
} from "lucide-react";

interface Payment {
  id: number;
  phone: string;
  amount: string;
  provider: string;
  planId: number;
  planName: string;
  status: string;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "bg-orange-muted text-orange/80 dark:bg-orange-muted dark:text-orange" },
  verified: { label: "تم التحقق", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const PROVIDER_NAMES: Record<string, string> = {
  libyana: "ليبيانا",
  madar: "مدار",
};

export default function AdminSubscriptionsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionTarget, setActionTarget] = useState<Payment | null>(null);
  const [actionType, setActionType] = useState<"verified" | "cancelled">("verified");
  const [actionLoading, setActionLoading] = useState(false);

  const pageSize = 20;

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("status", statusFilter);

      const res = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      if (!res.ok) throw Error();
      const json = await res.json();
      setPayments(json.data?.data ?? []);
      setTotal(json.data?.total ?? 0);
    } catch {
      setError("فشل تحميل الاشتراكات");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const totalPages = Math.ceil(total / pageSize);

  const handleAction = async () => {
    if (!actionTarget) return;
    setActionLoading(true);
    try {
      const res = await csrfFetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: actionTarget.id, status: actionType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "فشل تحديث الحالة");
      }
      setActionTarget(null);
      await fetchPayments();
      toast.success(actionType === "verified" ? "تم التحقق من الدفع ✓\nتم تفعيل الخطة للمطعم ✓" : "تم إلغاء الدفع ✓");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل تحديث الحالة";
      // Show the error but still close dialog — user can retry
      toast.error(msg);
      setActionTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  if (loading && payments.length === 0) {
    return (
      <div className="space-y-3 animate-fade-in">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-md bg-muted/50 animate-breath" />
        ))}
      </div>
    );
  }

  if (error && payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-lg font-medium">{error}</p>
        <Button variant="outline" onClick={fetchPayments} className="gap-2">
          <RefreshCw className="size-4" /> إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة الاشتراكات</h2>
          <p className="text-sm text-muted-foreground">
            {toArabicNumber(total)} اشتراك{total !== 1 ? "" : ""}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-md bg-card/50 border border-border/30 p-4">
          <p className="text-xs text-muted-foreground">الإجمالي</p>
          <p className="text-2xl font-bold mt-1">{toArabicNumber(total)}</p>
        </div>
        <div className="rounded-md bg-orange-muted dark:bg-orange-muted border border-orange/20 p-4">
          <p className="text-xs text-orange">قيد الانتظار</p>
          <p className="text-2xl font-bold mt-1 text-orange">{toArabicNumber(payments.filter(p => p.status === "pending").length)}</p>
        </div>
        <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/30 p-4">
          <p className="text-xs text-emerald-600">تم التحقق</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{toArabicNumber(payments.filter(p => p.status === "verified").length)}</p>
        </div>
        <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200/30 p-4">
          <p className="text-xs text-red-600">ملغى</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{toArabicNumber(payments.filter(p => p.status === "cancelled").length)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "pending")}>
          <SelectTrigger className="h-11 w-48 rounded-md" aria-label="فلتر الحالة">
            <SelectValue placeholder="فلترة حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">قيد الانتظار</SelectItem>
            <SelectItem value="verified">تم التحقق</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
            <SelectItem value="all">الكل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments list */}
      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <CreditCard className="size-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">لا توجد اشتراكات</p>
          {statusFilter !== "all" && (
            <Button variant="ghost" onClick={() => setStatusFilter("all")} className="gap-2">
              <FilterX className="size-4" /> عرض الكل
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {payments.map((p) => {
              const st = STATUS_MAP[p.status] ?? { label: p.status, color: "" };
              return (
                <div
                  key={p.id}
                  className="rounded-md border border-border/30 bg-card/50 p-5 hover:border-orange/20 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="size-11 rounded-xl bg-orange-muted dark:bg-orange-muted flex items-center justify-center shrink-0">
                        <Smartphone className="size-5 text-orange dark:text-orange" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold">{p.phone}</p>
                          <Badge className={cn("text-[10px]", st.color)}>{st.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span>{p.amount} د.ل</span>
                          <span>•</span>
                          <span>{PROVIDER_NAMES[p.provider] ?? p.provider}</span>
                          {p.planName && (
                            <>
                              <span>•</span>
                              <span>{p.planName}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatDate(p.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {p.status === "pending" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => { setActionTarget(p); setActionType("verified"); }}
                          className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/30 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                          title="تأكيد الدفع"
                        >
                          <Check className="size-4 text-emerald-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setActionTarget(p); setActionType("cancelled"); }}
                          className="size-9 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/30 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          title="إلغاء"
                        >
                          <X className="size-4 text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronRight className="size-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pn: number;
                if (totalPages <= 5) pn = i + 1;
                else if (page <= 3) pn = i + 1;
                else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                else pn = page - 2 + i;
                return (
                  <Button
                    key={pn}
                    variant={pn === page ? "orange" : "outline"}
                    size="icon"
                    onClick={() => setPage(pn)}
                    className="w-9"
                    aria-current={pn === page ? "page" : undefined}
                  >
                    {toArabicNumber(pn)}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Action confirmation dialog */}
      <Dialog open={actionTarget !== null} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent className="rounded-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "verified" ? "تأكيد الدفع" : "إلغاء الدفع"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "verified"
                ? `هل أنت متأكد من تأكيد دفع ${actionTarget?.amount} د.ل من ${actionTarget?.phone}؟`
                : `هل أنت متأكد من إلغاء الدفع من ${actionTarget?.phone}؟`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActionTarget(null)}>
              إلغاء
            </Button>
            <Button
              variant={actionType === "verified" ? "orange" : "destructive"}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="size-4 animate-spin" />
                  جاري التحديث...
                </span>
              ) : actionType === "verified" ? (
                "تأكيد"
              ) : (
                "إلغاء"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
