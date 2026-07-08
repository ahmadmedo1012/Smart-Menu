"use client";

import { csrfFetch } from "@/lib/csrf-client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { premiumToast } from "@/lib/premium-toast";
import {
  Store, Plus, Trash2, Crown, Star, Sparkles, Building2, ShoppingCart,
  RefreshCw, AlertCircle, AlertTriangle, FilterX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toArabicNumber } from "@/lib/format";
import { StatsRow, EmptyState, RestaurantListItem, Pagination } from "./RestaurantTable";
import { RestaurantFormDialog } from "./RestaurantFormDialog";

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

export default function AdminRestaurantsPage() {
  const [accessDenied, setAccessDenied] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (!d.success) { setAccessDenied(true); return }
      const { role, permissions } = d.data
      if (role !== "super_admin" && role !== "admin" && !(permissions ?? []).includes("MANAGE_RESTAURANTS")) setAccessDenied(true)
    }).catch(() => setAccessDenied(true))
  }, []);

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
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const pageSize = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page)); params.set("pageSize", String(pageSize));
      if (search.trim()) params.set("search", search.trim());
      if (planFilter !== "all") params.set("planFilter", planFilter);

      const [restRes, plansRes] = await Promise.all([fetch(`/api/restaurants?${params.toString()}`), fetch("/api/plans")]);
      if (!restRes.ok) throw new Error("فشل تحميل البيانات");
      const restJson = await restRes.json(); const plansJson = await plansRes.json();
      setRestaurants(restJson.data?.restaurants ?? restJson.data ?? []);
      setTotal(restJson.data?.total ?? restJson.meta?.total ?? 0);
      setPlans(plansJson.data ?? []);
    } catch (e: any) { setError(e.message || "فشل تحميل البيانات") }
    finally { setLoading(false) }
  }, [page, search, planFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const t = setTimeout(() => setSearch(searchInput), 300); return () => clearTimeout(t) }, [searchInput]);
  useEffect(() => { setPage(1) }, [search, planFilter]);

  const totalPages = Math.ceil(total / pageSize);

  const openAdd = () => { setEditing(null); setDialogOpen(true) };
  const openEdit = (r: Restaurant) => { setEditing(r); setDialogOpen(true) };

  const deleteRestaurant = async () => {
    if (!deleteTarget) return;
    try {
      await csrfFetch(`/api/restaurants/${deleteTarget.id}`, { method: "DELETE" });
      premiumToast("trash", "تم حذف المطعم"); setDeleteTarget(null); fetchData();
    } catch { premiumToast("error", "فشل الحذف") }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next });
  };

  const toggleAll = () => {
    if (selectedIds.size === restaurants.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(restaurants.map(r => r.id)));
  };

  const bulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`حذف ${toArabicNumber(count)} مطعم${count > 1 ? "اً" : ""}؟`)) return;
    try {
      await Promise.all([...selectedIds].map(id => csrfFetch(`/api/restaurants/${id}`, { method: "DELETE" })));
      premiumToast("trash", `تم حذف ${toArabicNumber(count)} مطعم`); setSelectedIds(new Set()); fetchData();
    } catch { premiumToast("error", "فشل الحذف الجماعي") }
  };

  // ---------- Loading ----------
  if (loading && restaurants.length === 0) return (
    <div className="space-y-3 animate-fade-in" aria-live="polite" aria-label="جارٍ التحميل">
      {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-md bg-muted/50 animate-breath" />)}
    </div>
  );

  // ---------- Error ----------
  if (error && restaurants.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in" aria-live="assertive">
      <AlertCircle className="size-10 text-destructive" />
      <p className="text-lg font-medium">{error}</p>
      <Button variant="outline" onClick={fetchData} className="gap-2"><RefreshCw className="size-4" /> إعادة المحاولة</Button>
    </div>
  );

  if (accessDenied) return (
    <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
      <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4"><AlertTriangle className="size-8 text-destructive" /></div>
      <h2 className="text-xl font-bold mb-2">غير مصرح</h2>
      <p className="text-sm text-muted-foreground max-w-xs">لا تملك الصلاحية للوصول إلى هذه الصفحة.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة المطاعم</h2>
          <p className="text-sm text-muted-foreground">{toArabicNumber(total)} مطعم</p>
        </div>
        <Button onClick={openAdd} className="gap-2 bg-orange hover:opacity-90 text-white">
          <Plus className="size-4" /> إضافة مطعم
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="ابحث باسم أو رابط أو هاتف..." aria-label="ابحث عن مطعم" />
        <Select value={planFilter} onValueChange={(v) => setPlanFilter(v ?? "all")}>
          <SelectTrigger className="h-11 w-40 rounded-md" aria-label="فلتر الخطة">
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

      <StatsRow total={total} restaurants={restaurants} />

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-orange-muted/50 dark:bg-orange-muted border border-orange/20">
          <span className="text-sm text-muted-foreground">تم اختيار {toArabicNumber(selectedIds.size)} مطعم</span>
          <Button variant="destructive" size="sm" onClick={bulkDelete} className="ms-auto">
            <Trash2 className="size-3.5 me-1" aria-hidden="true" /> حذف
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>إلغاء التحديد</Button>
        </div>
      )}

      {/* Restaurant list */}
      {restaurants.length === 0 ? (
        <EmptyState search={search} planFilter={planFilter} onClear={() => { setSearchInput(""); setSearch(""); setPlanFilter("all") }} onAdd={openAdd} />
      ) : (
        <>
          <div className="flex items-center gap-2 px-1">
            <input type="checkbox" checked={selectedIds.size === restaurants.length && restaurants.length > 0} onChange={toggleAll}
              className="rounded border-border" id="select-all" />
            <label htmlFor="select-all" className="text-xs text-muted-foreground cursor-pointer">تحديد الكل</label>
          </div>
          <div className="space-y-3">
            {restaurants.map((r) => (
              <RestaurantListItem
                key={r.id} r={r} isSelected={selectedIds.has(r.id)}
                onToggle={toggleSelect} onEdit={openEdit} onDelete={setDeleteTarget}
              />
            ))}
          </div>
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}

      <RestaurantFormDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        editing={editing} plans={plans}
        onSaved={fetchData}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-md">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>هل أنت متأكد من حذف &ldquo;{deleteTarget?.name}&rdquo;؟ جميع بيانات المطعم والطلبات والمنيو سيتم حذفها نهائياً.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={deleteRestaurant}>حذف</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
