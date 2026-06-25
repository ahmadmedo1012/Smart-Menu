"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { csrfFetch } from "@/lib/csrf-client";

interface Item { id: number; name: string; nameAr?: string; description: string; descriptionAr?: string; price: number; discountedPrice: number | null; image: string; status: string; categoryId: number }

const initForm = (catId: number) => ({ name: "", nameAr: "", description: "", descriptionAr: "", price: 0, discountedPrice: "", status: "available", categoryId: catId, image: "" });

const IMAGE_URL_RE = /^https?:\/\//i;

export default function ItemDialog({ open, onOpenChange, editing, categoryId, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  editing: Item | null; categoryId: number;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initForm(0));

  const openDialog = () => {
    setForm(editing ? {
      name: editing.name, nameAr: editing.nameAr || "", description: editing.description,
      descriptionAr: editing.descriptionAr || "", price: editing.price,
      discountedPrice: editing.discountedPrice ? String(editing.discountedPrice) : "",
      status: editing.status, categoryId: editing.categoryId, image: editing.image,
    } : initForm(categoryId));
  };

  const save = async () => {
    if (!form.name.trim() || !form.price) { toast.error("يرجى إدخال الاسم والسعر"); return; }
    if (form.image && !IMAGE_URL_RE.test(form.image)) { toast.error("رابط الصورة غير صالح"); return; }
    try {
      const body = { name: form.name.trim(), nameAr: form.nameAr.trim() || undefined, description: form.description.trim() || undefined, descriptionAr: form.descriptionAr.trim() || undefined, price: Number(form.price), discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : undefined, status: form.status, categoryId };
      const res = editing
        ? await csrfFetch(`/api/items/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await csrfFetch("/api/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editing ? "تم تحديث الصنف" : "تمت إضافة الصنف");
      onOpenChange(false); onSaved();
    } catch { toast.error("فشل الحفظ"); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (o) openDialog(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader><DialogTitle>{editing ? "تعديل صنف" : "إضافة صنف"}</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الاسم</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="كابتشينو" className="h-11 rounded-xl mt-1.5" /></div>
            <div><Label>الاسم بالإنجليزية</Label><Input value={form.nameAr} onChange={e => setForm({...form, nameAr: e.target.value})} placeholder="Cappuccino" className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الوصف</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1.5 rounded-xl" rows={2} /></div>
            <div><Label>الوصف بالإنجليزية</Label><Textarea value={form.descriptionAr} onChange={e => setForm({...form, descriptionAr: e.target.value})} className="mt-1.5 rounded-xl text-left" rows={2} dir="ltr" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>السعر (د.ل)</Label><Input type="number" value={form.price || ""} onChange={e => setForm({...form, price: Number(e.target.value)})} className="h-11 rounded-xl mt-1.5" min="0" step="0.5" /></div>
            <div><Label>سعر الخصم</Label><Input type="number" value={form.discountedPrice} onChange={e => setForm({...form, discountedPrice: e.target.value})} className="h-11 rounded-xl mt-1.5" min="0" step="0.5" placeholder="اختياري" /></div>
          </div>
          <div>
            <Label>الصورة</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={form.image} onChange={e => setForm({...form, image: e.target.value})} className="h-11 rounded-xl text-left flex-1" dir="ltr" placeholder="https://..." />
              <label className="size-11 rounded-xl border border-border/30 flex items-center justify-center hover:bg-accent cursor-pointer shrink-0">
                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                  const file = e.target.files?.[0]; if (!file) return; const fd = new FormData(); fd.append("file", file);
                  try { const r = await csrfFetch("/api/upload", { method: "POST", body: fd }); const d = await r.json(); if (d.data?.url) setForm({...form, image: d.data.url}); else toast.error("فشل رفع الصورة"); } catch { toast.error("فشل رفع الصورة"); }
                }} />
                <Upload className="size-4 text-muted-foreground" />
              </label>
            </div>
            {form.image && <div className="mt-2 rounded-xl overflow-hidden size-20 border border-border/30"><img src={form.image} alt="" className="size-full object-cover" loading="lazy" /></div>}
          </div>
          <div>
            <Label>الحالة</Label>
            <div className="flex gap-2 mt-1.5">
              {["available","unavailable"].map(s => (
                <button key={s} type="button" onClick={() => setForm({...form, status: s})}
                  className={cn("flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    form.status === s ? s === "available" ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-700" : "bg-red-500/10 border-red-400/30 text-red-700" : "border-border/30 hover:border-blue-200/30")}>
                  {s === "available" ? "متوفر" : "غير متوفر"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">إلغاء</Button>
          <Button onClick={save} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">{editing ? "تحديث" : "إضافة"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
