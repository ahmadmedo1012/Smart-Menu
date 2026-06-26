"use client";

import { csrfFetch } from "@/lib/csrf-client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Store, Plus, Pencil, Trash2, ExternalLink, Search,
  Crown, Star, Sparkles, Building2, ShoppingCart,
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle, FilterX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toArabicNumber } from "@/lib/format";

interface Plan {
  id: number; name: string; nameAr: string; price: number;
}

interface Restaurant {
  id: number; name: string; slug: string; description: string;
  phone: string; whatsapp: string; email: string; address: string;
  workingHours: string; planId: number | null;
  plan: Plan | null;
  _count: { orders: number; categories: number };
}

const PLAN_ICONS: Record<string, typeof Sparkles> = {
  "Free": Sparkles, "Basic": Star, "Pro": Crown, "Enterprise": Building2,
};
const PLAN_COLORS: Record<string, string> = {
  "Free": "from-gray-400 to-gray-500",
  "Basic": "from-gold to-gold/80",
  "Pro": "from-gold to-gold/80",
  "Enterprise": "from-gold to-gold/80",
};

export default function AdminRestaurantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", phone: "", whatsapp: "", email: "", address: "", workingHours: "", planId: "" });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const pageSize = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (search.trim()) params.set("search", search.trim());
      if (planFilter !== "all") params.set("planFilter", planFilter);

      const [restRes, plansRes] = await Promise.all([
        fetch(`/api/restaurants?${params.toString()}`),
        fetch("/api/plans"),
      ]);
      if (!restRes.ok) throw new Error("فشل تحميل البيانات");
      const restJson = await restRes.json();
      const plansJson = await plansRes.json();
      setRestaurants(restJson.data?.restaurants ?? restJson.data ?? []);
      setTotal(restJson.data?.total ?? restJson.meta?.total ?? 0);
      setPlans(plansJson.data ?? []);
    } catch (e: any) {
      setError(e.message || "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => { setPage(1) }, [search, planFilter]);

  const totalPages = Math.ceil(total / pageSize);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", phone: "", whatsapp: "", email: "", address: "", workingHours: "", planId: "" });
    setDialogOpen(true);
  };

  const openEdit = (r: Restaurant) => {
    setEditing(r);
    setForm({
      name: r.name, slug: r.slug, description: r.description,
      phone: r.phone, whatsapp: r.whatsapp, email: r.email || "",
      address: r.address || "", workingHours: r.workingHours || "",
      planId: r.planId ? String(r.planId) : "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("يرجى إدخال الاسم والرابط المختصر");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description: form.description.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        workingHours: form.workingHours.trim(),
      };
      if (form.planId) body.planId = Number(form.planId);

      if (editing) {
        const res = await csrfFetch(`/api/restaurants/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "فشل تحديث المطعم");
        toast.success("تم تحديث المطعم");
      } else {
        const res = await csrfFetch("/api/restaurants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, username: form.slug, password: `${form.slug}123` }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "فشل إنشاء المطعم");
        toast.success("تمت إضافة المطعم");
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error("فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const deleteRestaurant = async () => {
    if (!deleteTarget) return;
    try {
      await csrfFetch(`/api/restaurants/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("تم حذف المطعم");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("فشل الحذف");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === restaurants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(restaurants.map(r => r.id)));
    }
  };

  const bulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`حذف ${toArabicNumber(count)} مطعم${count > 1 ? "اً" : ""}؟`)) return;
    try {
      await Promise.all([...selectedIds].map(id => csrfFetch(`/api/restaurants/${id}`, { method: "DELETE" })));
      toast.success(`تم حذف ${toArabicNumber(count)} مطعم`);
      setSelectedIds(new Set());
      fetchData();
    } catch {
      toast.error("فشل الحذف الجماعي");
    }
  };

  const getPlanIcon = (planName?: string) => (planName && PLAN_ICONS[planName]) || Sparkles;
  const getPlanGradient = (planName?: string) => (planName && PLAN_COLORS[planName]) || "from-gray-400 to-gray-500";

  // ---------- Loading ----------
  if (loading && restaurants.length === 0) {
    return (
      <div className="space-y-3 animate-fade-in" aria-live="polite" aria-label="جارٍ التحميل">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted/50 animate-breath" />
        ))}
      </div>
    );
  }

  // ---------- Error ----------
  if (error && restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in" aria-live="assertive">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-lg font-medium">{error}</p>
        <Button variant="outline" onClick={fetchData} className="gap-2 rounded-xl">
          <RefreshCw className="size-4" /> إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة المطاعم</h2>
          <p className="text-sm text-muted-foreground">
            {toArabicNumber(total)} مطعم
          </p>
        </div>
        <Button onClick={openAdd} className="rounded-xl gap-2 bg-gold hover:opacity-90 text-white">
          <Plus className="size-4" />
          إضافة مطعم
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            placeholder="ابحث باسم أو رابط أو هاتف..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="ابحث عن مطعم"
            className="w-full h-11 pr-11 rounded-2xl border border-border/30 bg-card/50 px-4 text-sm outline-none transition-all focus-visible:border-gold focus-visible:ring-4 focus-visible:ring-gold/20"
          />
        </div>
        <Select value={planFilter} onValueChange={(v) => setPlanFilter(v ?? "all")}>
          <SelectTrigger className="h-11 w-40 rounded-2xl" aria-label="فلتر الخطة">
            <SelectValue placeholder="كل الخطط" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الخطط</SelectItem>
            <SelectItem value="free">مجاني</SelectItem>
            {plans.filter(p => Number(p.price) > 0).map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.nameAr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20 dark:border-gold/15 p-4">
          <p className="text-xs text-gold dark:text-gold">إجمالي المطاعم</p>
          <p className="text-2xl font-bold mt-1 text-gold dark:text-gold">{toArabicNumber(total)}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20 dark:border-gold/15 p-4">
          <p className="text-xs text-gold dark:text-gold">على الخطة المدفوعة</p>
          <p className="text-2xl font-bold mt-1 text-gold dark:text-gold">
            {toArabicNumber(restaurants.filter((r) => r.plan?.price && Number(r.plan.price) > 0).length)}
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20 dark:border-gold/15 p-4">
          <p className="text-xs text-gold dark:text-gold">إجمالي الطلبات</p>
          <p className="text-2xl font-bold mt-1 text-gold dark:text-gold">
            {toArabicNumber(restaurants.reduce((a, r) => a + r._count.orders, 0))}
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20 dark:border-gold/15 p-4">
          <p className="text-xs text-gold dark:text-gold">مجاني</p>
          <p className="text-2xl font-bold mt-1 text-gold dark:text-gold">
            {toArabicNumber(restaurants.filter((r) => !r.planId || Number(r.plan?.price) === 0).length)}
          </p>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gold-muted/50 dark:bg-gold-muted border border-gold/20">
          <span className="text-sm text-muted-foreground">
            تم اختيار {toArabicNumber(selectedIds.size)} مطعم
          </span>
          <Button variant="destructive" size="sm" onClick={bulkDelete} className="rounded-xl mr-auto">
            <Trash2 className="size-3.5 ml-1" aria-hidden="true" />
            حذف
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="rounded-xl">
            إلغاء التحديد
          </Button>
        </div>
      )}

      {/* Restaurant list */}
      {restaurants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Store className="size-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">{search || planFilter !== "all" ? "لا توجد نتائج" : "لا يوجد مطاعم مسجلة"}</p>
          {(search || planFilter !== "all") ? (
            <Button variant="ghost" onClick={() => { setSearchInput(""); setSearch(""); setPlanFilter("all") }} className="gap-2 rounded-xl">
              <FilterX className="size-4" /> إزالة الفلتر
            </Button>
          ) : (
            <Button onClick={openAdd} className="rounded-xl gap-2 bg-gold hover:opacity-90 text-white">
              <Plus className="size-4" /> إضافة مطعم
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedIds.size === restaurants.length && restaurants.length > 0}
              onChange={toggleAll}
              className="rounded border-border"
              id="select-all"
            />
            <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">تحديد الكل</label>
          </div>
          <div className="space-y-3">
            {restaurants.map((r) => {
              const PlanIcon = getPlanIcon(r.plan?.name);
              const planGrad = getPlanGradient(r.plan?.name);
              const isSelected = selectedIds.has(r.id);

              return (
                <div
                  key={r.id}
                  className={cn(
                    "rounded-2xl border p-5 transition-all",
                    isSelected
                      ? "border-gold/40 bg-gold-muted/30 dark:bg-gold-muted"
                      : "border-border/30 bg-card/50 hover:border-gold/20 hover:shadow-md"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(r.id)}
                        className="rounded border-border shrink-0 mt-1"
                        aria-label={`تحديد ${r.name}`}
                      />
                      <div className={cn(
                        "size-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0",
                        planGrad,
                      )} aria-hidden="true">
                        <PlanIcon className="size-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg">{r.name}</h3>
                          {r.plan ? (
                            <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full text-white bg-gradient-to-r", planGrad)}>
                              {r.plan.nameAr}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">بدون خطة</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>/{r.slug}</span>
                          {r.phone && <span dir="ltr">{r.phone}</span>}
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="size-3" aria-hidden="true" />
                            {toArabicNumber(r._count.orders)} طلب
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`/menu/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent transition-colors"
                        title="عرض المنيو"
                        aria-label={`عرض منيو ${r.name}`}
                      >
                        <ExternalLink className="size-4" aria-hidden="true" />
                      </a>
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent transition-colors"
                        title="تعديل"
                        aria-label={`تعديل ${r.name}`}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(r)}
                        className="size-9 rounded-xl border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors"
                        title="حذف"
                        aria-label={`حذف ${r.name}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
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
                size="icon-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="الصفحة السابقة"
              >
                <ChevronRight className="size-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "gradient" : "outline"}
                    size="icon-sm"
                    onClick={() => setPage(pageNum)}
                    className="w-9"
                    aria-label={`الصفحة ${pageNum}`}
                    aria-current={pageNum === page ? "page" : undefined}
                  >
                    {toArabicNumber(pageNum)}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="الصفحة التالية"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground mr-2">
                الصفحة {toArabicNumber(page)} من {toArabicNumber(totalPages)}
              </span>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل مطعم" : "إضافة مطعم"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="restaurant-name">اسم المطعم *</Label>
                <Input id="restaurant-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl mt-1.5" />
              </div>
              <div>
                <Label htmlFor="restaurant-slug">الرابط المختصر *</Label>
                <Input id="restaurant-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/g, "").toLowerCase() })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
            </div>
            <div>
              <Label htmlFor="restaurant-desc">الوصف</Label>
              <Input id="restaurant-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-11 rounded-xl mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="restaurant-phone">الهاتف</Label>
                <Input id="restaurant-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
              <div>
                <Label htmlFor="restaurant-whatsapp">واتساب</Label>
                <Input id="restaurant-whatsapp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="restaurant-email">البريد</Label>
                <Input id="restaurant-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
              <div>
                <Label htmlFor="restaurant-plan">الخطة</Label>
                <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v ?? "" })}>
                  <SelectTrigger className="h-11 rounded-xl mt-1.5">
                    <SelectValue placeholder="اختر خطة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون خطة</SelectItem>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nameAr} {Number(p.price) > 0 ? `- ${p.price} د.ل` : "- مجاني"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="restaurant-address">العنوان</Label>
              <Input id="restaurant-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-11 rounded-xl mt-1.5" />
            </div>
            <div>
              <Label htmlFor="restaurant-hours">ساعات العمل</Label>
              <Input id="restaurant-hours" value={form.workingHours} onChange={(e) => setForm({ ...form, workingHours: e.target.value })} className="h-11 rounded-xl mt-1.5" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl bg-gold hover:opacity-90 text-white">{saving ? "جارٍ..." : editing ? "تحديث" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف &ldquo;{deleteTarget?.name}&rdquo;؟ جميع بيانات المطعم والطلبات والمنيو سيتم حذفها نهائياً.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-xl">إلغاء</Button>
            <Button variant="destructive" onClick={deleteRestaurant} className="rounded-xl">حذف</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
