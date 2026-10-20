"use client";

import { csrfJson } from "@/lib/csrf-client";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PlanSummary as Plan } from '@/lib/plan-types';

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
import AnimatedTrash2 from '@/components/ui/trash-icon';
import { MotionPlus } from '@/components/ui/motion-icons';
import { toArabicNumber } from "@/lib/format";
import { LoadingAnnouncer } from "@/components/ui/loading-announcer"
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatsRow, EmptyState, RestaurantListItem, Pagination } from "./RestaurantTable";
import { RestaurantFormDialog } from "./RestaurantFormDialog";
import { useAccessGate, allowRolesOrPermission } from '@/hooks/useAccessGate';
import { AccessDenied } from '@/components/shared/AccessDenied';
// round89-E5: shared row type (was a local copy — the 6th duplicate)
import type { Restaurant } from '@/lib/restaurant-types';

export default function AdminRestaurantsPage() {
  const access = useAccessGate(allowRolesOrPermission(['super_admin', 'admin'], 'MANAGE_RESTAURANTS'));


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
  // r131-F4b (F5 completion, A1 P1-8): the native confirm() on bulk delete →
  // the shared Arabic ConfirmDialog.
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const pageSize = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page)); params.set("pageSize", String(pageSize));
      if (search.trim()) params.set("search", search.trim());
      if (planFilter !== "all") params.set("planFilter", planFilter);

      const [restRes, plansRes] = await Promise.all([fetch(`/api/restaurants?${params.toString()}`), fetch("/api/plans")]);
      if (!restRes.ok) throw new Error("تعذّر تحميل البيانات");
      const restJson = await restRes.json(); const plansJson = await plansRes.json();
      setRestaurants(restJson.data?.restaurants ?? restJson.data ?? []);
      setTotal(restJson.data?.total ?? restJson.meta?.total ?? 0);
      setPlans(plansJson.data ?? []);
    } catch (e) { setError(getErrorMessage(e, "تعذّر تحميل البيانات")) }
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
      await csrfJson(`/api/restaurants/${deleteTarget.id}`, { method: "DELETE" });
      premiumToast("trash", "تم حذف المطعم"); setDeleteTarget(null); fetchData();
    } catch (e) { premiumToast("error", getErrorMessage(e, "تعذّر الحذف")) }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next });
  };

  const toggleAll = () => {
    if (selectedIds.size === restaurants.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(restaurants.map(r => r.id)));
  };

  const toggleShowOnLanding = async (id: number, show: boolean) => {
    try {
      await csrfJson(`/api/restaurants/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnLanding: show }),
      })
      premiumToast("save", show ? "تم تفعيل الظهور في الرئيسية" : "تم إخفاء المطعم من الرئيسية")
      fetchData()
    } catch (e) { premiumToast("error", getErrorMessage(e, "تعذّر التحديث")) }
  }

  const bulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    // r131-F4b: the guard moved into the ConfirmDialog below (no native confirm()).
    try {
      await Promise.all([...selectedIds].map(id => csrfJson(`/api/restaurants/${id}`, { method: "DELETE" })));
      premiumToast("trash", `تم حذف ${toArabicNumber(count)} مطعم`); setSelectedIds(new Set()); fetchData();
    } catch (e) { premiumToast("error", getErrorMessage(e, "تعذّر الحذف الجماعي")) }
    finally { setBulkConfirmOpen(false); }
  };

  // ---------- Loading ----------
  if (loading && restaurants.length === 0) return (
    <div className="space-y-3 animate-fade-in" aria-live="polite" aria-label="جارٍ التحميل">
      <LoadingAnnouncer loading message="جارٍ تحميل المطاعم…" />
      {/* W7-G (A2 audit): الأشكال ترتجف بلمعة .skeleton القانونية — نبض الشفافية المتقاعد (animate-breath) كان لغة تحميل ثانية. */}
      {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-md skeleton" />)}
    </div>
  );

  // ---------- Error ----------
  // r131-F4b (F5 completion, A1 P1-12): hand-rolled error branch joins the
  // ONE canonical ErrorState family (56px danger tile / 18-600 / retry CTA).
  if (error && restaurants.length === 0) return (
    <ErrorState
      title="تعذّر تحميل المطاعم"
      error={error}
      onRetry={fetchData}
    />
  );

    if (access === 'denied') return <AccessDenied />

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 animate-fade-in">
      {/* r131-F5 (A1 P0-8): canonical page header. */}
      <PageHeader
        title="إدارة المطاعم"
        subtitle={`${toArabicNumber(total)} مطعم — إدارة المنيوهات والخطط`}
        actions={
          <Button onClick={openAdd} className="gap-2">
            <MotionPlus className="size-4" /> إضافة مطعم
          </Button>
        }
      />

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="ابحث باسم أو رابط أو هاتف…" aria-label="ابحث عن مطعم" />
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
          <Button variant="destructive" size="sm" onClick={() => setBulkConfirmOpen(true)} className="ms-auto">
            <AnimatedTrash2 className="size-3.5 me-1" aria-hidden="true" /> حذف
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
                onToggleShowOnLanding={toggleShowOnLanding}
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
        <DialogContent>
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

      {/* r131-F4b: bulk-delete confirm (replaces the native confirm()) */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title="حذف جماعي"
        description={`سيتم حذف ${toArabicNumber(selectedIds.size)} مطعم${selectedIds.size > 1 ? "اً" : ""} نهائياً مع جميع بياناته — لا يمكن التراجع.`}
        confirmLabel="حذف"
        onConfirm={bulkDelete}
      />
    </div>
  );
}
