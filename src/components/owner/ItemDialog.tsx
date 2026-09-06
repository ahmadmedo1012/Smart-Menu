'use client';
import { useState, useEffect , useId } from 'react';
import {
        DIETARY_OPTIONS,
        ALLERGEN_OPTIONS,
        DIETARY_ICONS,
        DIETARY_LABELS,
        ALLERGEN_LABELS,
} from '@/lib/dietary';
import {Loader2, AlertTriangle} from 'lucide-react';
import AnimatedUpload from '@/components/ui/upload-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { premiumToast } from '@/lib/premium-toast';
import { cn } from '@/lib/utils';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Switch } from '@/components/ui/switch';
import SparklesIcon from '@/components/ui/sparkles-icon';
import { csrfFetch } from '@/lib/csrf-client';
import { compressImage } from '@/lib/image-compress';

interface Item {
        id: number;
        name: string;
        nameAr?: string;
        description: string;
        descriptionAr?: string;
        price: number;
        discountedPrice: number | null;
        image: string;
        status: string;
        categoryId: number;
        dietaryTags?: string[];
        allergens?: string[];
        isFeatured?: boolean;
        featuredRank?: number | null;
        // round88-C: legacy single showcaseTag dropped — array only.
        showcaseTags?: string[] | null;
}



const initForm = (catId: number) => ({
        name: '',
        nameAr: '',
        description: '',
        descriptionAr: '',
        price: 0,
        discountedPrice: '',
        status: 'available',
        categoryId: catId,
        image: '',
        dietaryTags: [] as string[],
        allergens: [] as string[],
        isFeatured: false,
        featuredRank: '',
        showcaseTags: [] as string[],
});

const IMAGE_URL_RE = /^(https?:\/\/|data:image\/)/i;


export function ItemDialog({
        open,
        onOpenChange,
        editing,
        categoryId,
        onSaved,
}: {
        open: boolean;
        onOpenChange: (o: boolean) => void;
        editing: Item | null;
        categoryId: number;
        onSaved: () => void;
}) {
        // round86-C9: label-control associations (axe: label-without-control)
        const fId = useId();
        const [form, setForm] = useState(initForm(0));
        const [saving, setSaving] = useState(false);
        const [uploading, setUploading] = useState(false);
        const [badgeDraft, setBadgeDraft] = useState('');

        // Round83 §2.3 — add a badge chip (deduped, trimmed, max 3).
        const addBadge = () => {
                const tag = badgeDraft.trim().slice(0, 40);
                if (!tag || form.showcaseTags.length >= 3 || form.showcaseTags.includes(tag)) {
                        setBadgeDraft('');
                        return;
                }
                setForm({ ...form, showcaseTags: [...form.showcaseTags, tag] });
                setBadgeDraft('');
        };

        // Reset form when dialog opens
        useEffect(() => {
                if (open) {
                        setBadgeDraft('');
                        setForm(
                                editing
                                        ? {
                                                        name: editing.name,
                                                        nameAr: editing.nameAr || '',
                                                        description: editing.description,
                                                        descriptionAr: editing.descriptionAr || '',
                                                        price: editing.price,
                                                        discountedPrice: editing.discountedPrice ? String(editing.discountedPrice) : '',
                                                        status: editing.status,
                                                        categoryId: editing.categoryId,
                                                        image: editing.image,
                                                        dietaryTags: editing.dietaryTags ?? [],
                                                        allergens: editing.allergens ?? [],
                                                        isFeatured: editing.isFeatured ?? false,
                                                        featuredRank: editing.featuredRank != null ? String(editing.featuredRank) : '',
                                                        showcaseTags: editing.showcaseTags ?? [],
                                                }
                                        : initForm(categoryId)
                        );
                }
        }, [open, editing, categoryId]);

        const save = async () => {
                if (saving) return;
                if (!form.name.trim() || !form.price) {
                        premiumToast('error', 'يرجى إدخال الاسم والسعر');
                        return;
                }
                if (form.image && !IMAGE_URL_RE.test(form.image)) {
                        premiumToast('error', 'رابط الصورة غير صالح');
                        return;
                }
                if (form.isFeatured && form.featuredRank) {
                        const rank = Number(form.featuredRank);
                        if (!Number.isInteger(rank) || rank < 1 || rank > 5) {
                                premiumToast('error', 'ترتيب الظهور يجب أن يكون رقمًا صحيحًا من 1 إلى 5');
                                return;
                        }
                }
                setSaving(true);
                try {
                        const body = {
                                name: form.name.trim(),
                                nameAr: form.nameAr.trim() || undefined,
                                description: form.description.trim() || undefined,
                                descriptionAr: form.descriptionAr.trim() || undefined,
                                price: Number(form.price),
                                discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : undefined,
                                image: form.image || undefined,
                                status: form.status,
                                categoryId: form.categoryId,
                                dietaryTags: form.dietaryTags,
                                allergens: form.allergens,
                                isFeatured: form.isFeatured,
                                // round88-C fix (surfaced by team8): an OFF→ON cycle used to
                                // PERMANENTLY destroy the owner's rank/badges (the old payload
                                // sent rank:null + tags:[] on every un-feature). Now an
                                // un-featured save leaves both fields UNSENT (undefined) —
                                // the server's partial-update rule preserves them inert
                                // (display filters by isFeatured first), so re-featuring
                                // restores the scene exactly as it was. An explicit rank
                                // (or tag edits) while featured is still sent and wins.
                                featuredRank: form.isFeatured
                                        ? (form.featuredRank ? Number(form.featuredRank) : null)
                                        : undefined,
                                // round88-C: the array is the only badge storage (legacy
                                // single-tag mirror column dropped this round).
                                showcaseTags: form.isFeatured ? form.showcaseTags : undefined,
                                modifierGroups: undefined,
                        };
                        const res = editing
                                ? await csrfFetch(`/api/items/${editing.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(body),
                                        })
                                : await csrfFetch('/api/items', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(body),
                                        });
                        if (!res.ok) {
                                let errMsg = 'فشل الحفظ';
                                try {
                                        const e = await res.json();
                                        errMsg = e?.error || errMsg;
                                        if (e?.details?.length) errMsg += ' — ' + e.details.join('; ');
                                } catch {}
                                throw new Error(errMsg);
                        }
                        premiumToast('save', editing ? 'تم تحديث الصنف' : 'تمت إضافة الصنف');
                        onOpenChange(false);
                        onSaved();
                } catch (e) {
                        premiumToast('error', e instanceof Error ? e.message : 'فشل الحفظ');
                } finally {
                        setSaving(false);
                }
        };

        return (
                <Dialog open={open} onOpenChange={onOpenChange}>
                        <DialogContent className="max-w-lg rounded-md">
                                <DialogHeader>
                                        <DialogTitle>{editing ? 'تعديل صنف' : 'إضافة صنف'}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                        <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                        <Label htmlFor={`${fId}-name`}>الاسم</Label>
                                                        
                                                                        <Input
                                                                        id={`${fId}-name`}
                                                                value={form.name}
                                                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                                                placeholder="كابتشينو"
                                                                className="h-11 rounded-md mt-1.5"
                                                        />
                                                </div>
                                                <div>
                                                        <Label htmlFor={`${fId}-name-ar`}>الاسم بالإنجليزية</Label>
                                                        
                                                                        <Input
                                                                        id={`${fId}-name-ar`}
                                                                value={form.nameAr}
                                                                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                                                                placeholder="اختياري — بالإنجليزية"
                                                                className="h-11 rounded-md mt-1.5 text-start"
                                                                dir="ltr"
                                                        />
                                                </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                        <Label htmlFor={`${fId}-desc`}>الوصف</Label>
                                                        
                                                                        <Textarea
                                                                        id={`${fId}-desc`}
                                                                value={form.description}
                                                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                                                className="mt-1.5 rounded-md"
                                                                rows={2}
                                                        />
                                                </div>
                                                <div>
                                                        <Label htmlFor={`${fId}-desc-ar`}>الوصف بالإنجليزية</Label>
                                                        
                                                                        <Textarea
                                                                        id={`${fId}-desc-ar`}
                                                                value={form.descriptionAr}
                                                                onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
                                                                className="mt-1.5 rounded-md text-start"
                                                                rows={2}
                                                                dir="ltr"
                                                        />
                                                </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                        <Label htmlFor={`${fId}-price`}>السعر (د.ل)</Label>
                                                        
                                                                        <Input
                                                                        id={`${fId}-price`}
                                                                type="number"
                                                                value={form.price || ''}
                                                                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                                                                className="h-11 rounded-md mt-1.5"
                                                                min="0"
                                                                step="0.5"
                                                        />
                                                </div>
                                                <div>
                                                        <Label htmlFor={`${fId}-disc-price`}>سعر الخصم</Label>
                                                        
                                                                        <Input
                                                                        id={`${fId}-disc-price`}
                                                                type="number"
                                                                value={form.discountedPrice}
                                                                onChange={(e) => setForm({ ...form, discountedPrice: e.target.value })}
                                                                className="h-11 rounded-md mt-1.5"
                                                                min="0"
                                                                step="0.5"
                                                                placeholder="اختياري"
                                                        />
                                                </div>
                                        </div>
                                        <div>
                                                <Label htmlFor={`${fId}-image`}>الصورة</Label>
                                                <div className="flex gap-2 mt-1.5">
                                                        
                                                                        <Input
                                                                        id={`${fId}-image`}
                                                                value={form.image}
                                                                onChange={(e) => setForm({ ...form, image: e.target.value })}
                                                                className="h-11 rounded-md text-start flex-1"
                                                                dir="ltr"
                                                                placeholder="https://..."
                                                                disabled={uploading}
                                                        />
                                                        <label
                                                                className="size-11 rounded-md border border-border/30 flex items-center justify-center hover:bg-accent cursor-pointer shrink-0 focus-within:outline-none focus-within:ring-2 focus-within:ring-orange/60"
                                                                style={{ opacity: uploading ? 0.5 : 1, pointerEvents: uploading ? 'none' : 'auto' }}
                                                        >
                                                                <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        onChange={async (e) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (!file) return;
                                                                                setUploading(true);
                                                                                premiumToast('info', 'جاري رفع ومعالجة الصورة...');
                                                                                try {
                                                                                        const compressed = await compressImage(file);
                                                                                        const fd = new FormData();
                                                                                        fd.append('file', compressed, file.name.replace(/\.[^.]+$/, '.jpg'));
                                                                                        const r = await csrfFetch('/api/upload', { method: 'POST', body: fd });
                                                                                        const d = await r.json();
                                                                                        if (!r.ok) {
                                                                                                const detail = d?.details?.length ? ` — ${d.details.join('; ')}` : '';
                                                                                                premiumToast('error', `${d?.error || 'فشل رفع الصورة'}${detail}`);
                                                                                                return;
                                                                                        }
                                                                                        if (d.data?.url) setForm({ ...form, image: d.data.url });
                                                                                        else premiumToast('error', 'فشل رفع الصورة');
                                                                                } catch (e) {
                                                                                        premiumToast('error', e instanceof Error ? e.message : 'فشل رفع الصورة');
                                                                                } finally {
                                                                                        setUploading(false);
                                                                                }
                                                                        }}
                                                                        disabled={uploading}
                                                                />
                                                                {uploading ? (
                                                                        <Loader2 className="size-4 text-muted-foreground animate-spin" />
                                                                ) : (
                                                                        <AnimatedUpload className="size-4 text-muted-foreground" />
                                                                )}
                                                        </label>
                                                </div>
                                                {form.image && (
                                                        <div className="mt-2 rounded-md overflow-hidden size-20 border border-border/30">
                                                                {/* round88-A2: box is size-20 (80px) */}
                                                                <OptimizedImage src={form.image} alt="" className="size-full" skeleton={false} sizes="80px" />
                                                        </div>
                                                )}
                                        </div>
                                        <div>
                                                <span id={"`${fId}-status`"} className="text-sm font-medium leading-none block">الحالة</span>
                                                <div className="flex gap-2 mt-1.5">
                                                        {['available', 'unavailable'].map((s) => (
                                                                <button
                                                                        key={s}
                                                                        type="button"
                                                                        onClick={() => setForm({ ...form, status: s })}
                                                                        className={cn(
                                                                                'flex-1 py-2.5 rounded-md text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                                form.status === s
                                                                                        ? s === 'available'
                                                                                                ? 'bg-success/10 border-success/30 text-success'
                                                                                                : 'bg-destructive/10 border-destructive/30 text-destructive'
                                                                                        : 'border-border/30 hover:border-orange/30'
                                                                        )}
                                                                >
                                                                        {s === 'available' ? 'متوفر' : 'غير متوفر'}
                                                                </button>
                                                        ))}
                                                </div>
                                        </div>

                                        {/* Stage H (round79) — featured-showcase control */}
                                        <div className="rounded-md border border-orange/25 bg-orange/5 p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-start gap-2">
                                                                <SparklesIcon className="size-4 text-ember mt-0.5 shrink-0" aria-hidden="true" />
                                                                <div>
                                                                        <Label htmlFor="item-featured-switch">عرض في قسم الأصناف المميزة</Label>
                                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                                                يظهر الصنف أعلى صفحة المنيو داخل العرض السينمائي (حتى 5 أصناف)
                                                                        </p>
                                                                </div>
                                                        </div>
                                                        <Switch
                                                                id="item-featured-switch"
                                                                aria-label="تمييز الصنف في القسم السينمائي"
                                                                checked={form.isFeatured}
                                                                onCheckedChange={(v) => setForm({ ...form, isFeatured: v })}
                                                        />
                                                </div>
                                                {form.isFeatured && (
                                                        <div className="mt-3 space-y-3">
                                                                <div className="grid grid-cols-2 gap-3">
                                                                        <div>
                                                                                <Label htmlFor={`${fId}-rank`}>ترتيب الظهور</Label>
                                                                                
                                                                        <Input
                                                                        id={`${fId}-rank`}
                                                                                        type="number"
                                                                                        min="1"
                                                                                        max="5"
                                                                                        value={form.featuredRank}
                                                                                        onChange={(e) => setForm({ ...form, featuredRank: e.target.value })}
                                                                                        className="h-11 rounded-md mt-1.5"
                                                                                        placeholder="تلقائي"
                                                                                />
                                                                        </div>
                                                                        {/* Round83 §2.3 — multi-badge chips input (max 3).
                                                                                No pre-existing chips-input component in the codebase:
                                                                                OrderDialog chips are a static multi-SELECT (aria-pressed
                                                                                toggles), this is a free-text ADD list — different pattern,
                                                                                so it is implemented inline here. */}
                                                                        <div className="col-span-2">
                                                                                <span id={"`${fId}-showcase-tags`"} className="text-sm font-medium leading-none block">شارات العرض (حتى ٣)</span>
                                                                                <div className="flex gap-2 mt-1.5">
                                                                                        <Input
                                                                                                value={badgeDraft}
                                                                                                onChange={(e) => setBadgeDraft(e.target.value)}
                                                                                                onKeyDown={(e) => {
                                                                                                        if (e.key === 'Enter') {
                                                                                                                e.preventDefault();
                                                                                                                addBadge();
                                                                                                        }
                                                                                                }}
                                                                                                maxLength={40}
                                                                                                className="h-11 rounded-md"
                                                                                                placeholder={form.showcaseTags.length >= 3 ? 'الحد الأقصى ٣ شارات' : 'مثال: الأكثر طلبًا'}
                                                                                                disabled={form.showcaseTags.length >= 3}
                                                                                        />
                                                                                        <Button
                                                                                                type="button"
                                                                                                variant="outline"
                                                                                                onClick={addBadge}
                                                                                                disabled={form.showcaseTags.length >= 3 || !badgeDraft.trim()}
                                                                                                className="h-11 shrink-0"
                                                                                                aria-label="إضافة شارة"
                                                                                        >
                                                                                                إضافة
                                                                                        </Button>
                                                                                </div>
                                                                                {form.showcaseTags.length > 0 && (
                                                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                                                                {form.showcaseTags.map((tag) => (
                                                                                                        <button
                                                                                                                key={tag}
                                                                                                                type="button"
                                                                                                                aria-label={`إزالة الشارة ${tag}`}
                                                                                                                onClick={() =>
                                                                                                                        setForm({
                                                                                                                                ...form,
                                                                                                                                showcaseTags: form.showcaseTags.filter((t) => t !== tag),
                                                                                                                        })}
                                                                                                                className="inline-flex items-center gap-1.5 rounded-full border border-basil/40 bg-basil/15 px-3 py-1 text-[11px] font-medium text-basil transition-colors hover:bg-basil/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-basil/60"
                                                                                                        >
                                                                                                                {tag}
                                                                                                                <AlertTriangle className="size-3 rotate-12" aria-hidden="true" />
                                                                                                        </button>
                                                                                                ))}
                                                                                        </div>
                                                                                )}
                                                                        </div>
                                                                </div>
                                                        </div>
                                                )}
                                        </div>

                                        {/* Dietary tags */}
                                        <div>
                                                <span id={"`${fId}-dietary`"} className="text-sm font-medium leading-none block">شارات الطعام</span>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                        {DIETARY_OPTIONS.map((t) => {
                                                                const active = form.dietaryTags?.includes(t);
                                                                return (
                                                                        <button
                                                                                key={t}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                        setForm({
                                                                                                ...form,
                                                                                                dietaryTags: active
                                                                                                        ? (form.dietaryTags ?? []).filter((x) => x !== t)
                                                                                                        : [...(form.dietaryTags ?? []), t],
                                                                                        })
                                                                                }
                                                                                className={cn(
                                                                                        'text-[11px] px-2 py-1 rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                                        active
                                                                                                ? 'bg-basil/15 border-basil/40 text-basil'
                                                                                                : 'border-border/30 hover:border-basil/40 text-muted-foreground'
                                                                                )}
                                                                        >
                                                                                {DIETARY_ICONS[t] || '🌿'} {DIETARY_LABELS[t] || t}
                                                                        </button>
                                                                );
                                                        })}
                                                </div>
                                        </div>

                                        {/* Allergens */}
                                        <div>
                                                <span id={"`${fId}-allergens`"} className="text-sm font-medium leading-none block">مسببات الحساسية</span>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                        {ALLERGEN_OPTIONS.map((t) => {
                                                                const active = form.allergens?.includes(t);
                                                                return (
                                                                        <button
                                                                                key={t}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                        setForm({
                                                                                                ...form,
                                                                                                allergens: active
                                                                                                        ? (form.allergens ?? []).filter((x) => x !== t)
                                                                                                        : [...(form.allergens ?? []), t],
                                                                                        })
                                                                                }
                                                                                className={cn(
                                                                                        'text-[11px] px-2 py-1 rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                                        active
                                                                                                ? 'bg-warning/15 border-warning/40 text-warning'
                                                                                                : 'border-border/30 hover:border-warning/40 text-muted-foreground'
                                                                                )}
                                                                        >
                                                                                <AlertTriangle className="size-3 inline-block me-1 text-warning" />{ALLERGEN_LABELS[t] || t}
                                                                        </button>
                                                                );
                                                        })}
                                                </div>
                                        </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                                                إلغاء
                                        </Button>
                                        <Button variant="orange" onClick={save} disabled={saving || uploading}>
                                                {editing ? 'تحديث' : 'إضافة'}
                                        </Button>
                                </div>
                        </DialogContent>
                </Dialog>
        );
}
