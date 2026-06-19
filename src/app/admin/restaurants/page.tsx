"use client";

import { useEffect, useState } from "react";
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
  Crown, Star, Sparkles, Building2, Users, ShoppingCart,
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
  "Basic": "from-amber-500 to-amber-600",
  "Pro": "from-amber-500 via-yellow-500 to-amber-600",
  "Enterprise": "from-cyan-500 via-purple-500 to-pink-500",
};

export default function AdminRestaurantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", phone: "", whatsapp: "", email: "", address: "", workingHours: "", planId: "" });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [restRes, plansRes] = await Promise.all([
        fetch("/api/restaurants"),
        fetch("/api/plans"),
      ]);
      const restJson = await restRes.json();
      const plansJson = await plansRes.json();
      setRestaurants(restJson.data?.restaurants ?? []);
      setPlans(plansJson.data ?? []);
    } catch (e: any) {
      toast.error("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
        await fetch(`/api/restaurants/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        toast.success("تم تحديث المطعم");
      } else {
        await fetch("/api/restaurants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, username: form.slug, password: form.slug + "123" }),
        });
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
      await fetch(`/api/restaurants/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("تم حذف المطعم");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("فشل الحذف");
    }
  };

  const filtered = restaurants.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.includes(q) || r.slug.includes(q) || r.phone.includes(q);
  });

  const getPlanIcon = (planName?: string) => {
    const Icon = (planName && PLAN_ICONS[planName]) || Sparkles;
    return Icon;
  };
  const getPlanGradient = (planName?: string) => {
    return (planName && PLAN_COLORS[planName]) || "from-gray-400 to-gray-500";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">إدارة المطاعم</h2>
          <p className="text-sm text-muted-foreground">
            {toArabicNumber(restaurants.length)} مطعم مسجل
          </p>
        </div>
        <Button onClick={openAdd} className="rounded-xl gap-2">
          <Plus className="size-4" />
          إضافة مطعم
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="ابحث عن مطعم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 pr-11 rounded-2xl border border-border/30 bg-card/50 px-4 text-sm outline-none transition-all focus-visible:border-amber-300 focus-visible:ring-4 focus-visible:ring-amber-500/20"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4">
          <p className="text-xs text-muted-foreground">إجمالي المطاعم</p>
          <p className="text-2xl font-bold mt-1">{toArabicNumber(restaurants.length)}</p>
        </div>
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4">
          <p className="text-xs text-muted-foreground">على الخطة المدفوعة</p>
          <p className="text-2xl font-bold mt-1">
            {toArabicNumber(restaurants.filter((r) => r.plan?.price && r.plan.price > 0).length)}
          </p>
        </div>
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4">
          <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
          <p className="text-2xl font-bold mt-1">
            {toArabicNumber(restaurants.reduce((a, r) => a + r._count.orders, 0))}
          </p>
        </div>
        <div className="rounded-2xl bg-card/50 border border-border/30 p-4">
          <p className="text-xs text-muted-foreground">مجاني</p>
          <p className="text-2xl font-bold mt-1">
            {toArabicNumber(restaurants.filter((r) => !r.planId || r.plan?.price === 0).length)}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted/50 animate-breath" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Store className="size-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">لا توجد مطاعم</p>
          <Button onClick={openAdd} className="rounded-xl gap-2">
            <Plus className="size-4" />
            إضافة مطعم
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const PlanIcon = getPlanIcon(r.plan?.name);
            const planGrad = getPlanGradient(r.plan?.name);

            return (
              <div
                key={r.id}
                className="rounded-2xl border border-border/30 bg-card/50 p-5 hover:border-amber-200/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Plan icon */}
                    <div className={cn(
                      "size-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0",
                      planGrad,
                    )}>
                      <PlanIcon className="size-6 text-white" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{r.name}</h3>
                        {r.plan && (
                          <span className={cn(
                            "text-[10px] font-bold px-2.5 py-1 rounded-full text-white bg-gradient-to-r",
                            planGrad,
                          )}>
                            {r.plan.nameAr}
                          </span>
                        )}
                        {!r.plan && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            بدون خطة
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>/{r.slug}</span>
                        {r.phone && <span dir="ltr">{r.phone}</span>}
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="size-3" />
                          {toArabicNumber(r._count.orders)} طلب
                        </span>
                        <span className="flex items-center gap-1">
                          <Store className="size-3" />
                          {toArabicNumber(r._count.categories)} قسم
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
                    >
                      <ExternalLink className="size-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="size-9 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent transition-colors"
                      title="تعديل"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(r)}
                      className="size-9 rounded-xl border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
                <Label>اسم المطعم *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 rounded-xl mt-1.5" />
              </div>
              <div>
                <Label>الرابط المختصر *</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.replace(/[^a-z0-9-]/g, "").toLowerCase() })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
            </div>
            <div>
              <Label>الوصف</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-11 rounded-xl mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الهاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
              <div>
                <Label>واتساب</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>البريد</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
              <div>
                <Label>الخطة</Label>
                <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v ?? "" })}>
                  <SelectTrigger className="h-11 rounded-xl mt-1.5">
                    <SelectValue placeholder="اختر خطة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون خطة</SelectItem>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nameAr} {p.price > 0 ? `- ${p.price} د.ل` : "- مجاني"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-11 rounded-xl mt-1.5" />
            </div>
            <div>
              <Label>ساعات العمل</Label>
              <Input value={form.workingHours} onChange={(e) => setForm({ ...form, workingHours: e.target.value })} className="h-11 rounded-xl mt-1.5" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl">{saving ? "جارٍ..." : editing ? "تحديث" : "إضافة"}</Button>
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
