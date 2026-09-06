'use client';
import { useState, useEffect , useId } from 'react';
import {
        DIETARY_OPTIONS,
        ALLERGEN_OPTIONS,
        DIETARY_ICONS,
        DIETARY_LABELS,
        ALLERGEN_LABELS,
} from '@/lib/dietary';
import {Loader2, AlertTriangle, Plus, Trash2} from 'lucide-react';
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
import { toArabicNumber } from '@/lib/format';

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
        // w3-f1 (F1-3): groups from GET /api/items (Decimal arrives as string
        // over JSON; the draft mapper normalizes it to a string input value).
        modifierGroups?: ItemModifierGroup[];
}

/* w3-f1 — serialized shapes returned by GET /api/items. */
export type ItemModifierOption = {
        id: number;
        nameAr: string;
        name: string;
        priceDelta: string | number;
        isAvailable: boolean;
        sortOrder: number;
};
export type ItemModifierGroup = {
        id: number;
        nameAr: string;
        name: string;
        minSelect: number;
        maxSelect: number;
        required: boolean;
        sortOrder: number;
        options: ItemModifierOption[];
};

/* w3-f1 — editor drafts (numeric fields as strings for controlled inputs). */
type OptionDraft = {
        key: string;
        id?: number;
        nameAr: string;
        name: string;
        priceDelta: string;
        isAvailable: boolean;
        sortOrder: number;
};
type GroupDraft = {
        key: string;
        id?: number;
        nameAr: string;
        name: string;
        minSelect: string;
        maxSelect: string;
        required: boolean;
        sortOrder: string;
        options: OptionDraft[];
};

const MAX_MODIFIER_GROUPS = 6;
const MAX_OPTIONS_PER_GROUP = 20;

/** w3-f1 — the exact JSON the items POST/PUT routes expect (zod-validated). */
export type ModifierGroupPayload = {
        id?: number;
        nameAr: string;
        name?: string;
        minSelect: number;
        maxSelect: number;
        required: boolean;
        sortOrder: number;
        options: Array<{
                id?: number;
                nameAr: string;
                name?: string;
                priceDelta: number;
                isAvailable: boolean;
                sortOrder: number;
        }>;
};

let draftSeq = 0;
function nextDraftKey(prefix: string): string {
        draftSeq += 1;
        return `${prefix}-${Date.now().toString(36)}-${draftSeq}`;
}

function groupsFromItem(groups: ItemModifierGroup[] | undefined): GroupDraft[] {
        return (groups ?? []).map((g) => ({
                key: nextDraftKey('g'),
                id: g.id,
                nameAr: g.nameAr,
                name: g.name,
                minSelect: String(g.minSelect),
                maxSelect: String(g.maxSelect),
                required: g.required,
                sortOrder: String(g.sortOrder),
                options: (g.options ?? []).map((o) => ({
                        key: nextDraftKey('o'),
                        id: o.id,
                        nameAr: o.nameAr,
                        name: o.name,
                        priceDelta: String(o.priceDelta ?? 0),
                        isAvailable: o.isAvailable,
                        sortOrder: o.sortOrder,
                })),
        }));
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
        // w3-f1 (F1-3): modifier-group editor state (draft list)
        const [groups, setGroups] = useState<GroupDraft[]>([]);

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

        /* ── w3-f1 (F1-3): modifier-group draft handlers ── */
        const addGroup = () => {
                if (groups.length >= MAX_MODIFIER_GROUPS) {
                        premiumToast('error', `الحد الأقصى ${MAX_MODIFIER_GROUPS} مجموعات لكل صنف`);
                        return;
                }
                setGroups([
                        ...groups,
                        {
                                key: nextDraftKey('g'),
                                nameAr: '',
                                name: '',
                                minSelect: '0',
                                maxSelect: '1',
                                required: false,
                                sortOrder: String(groups.length),
                                options: [],
                        },
                ]);
        };

        const updateGroup = (key: string, patch: Partial<GroupDraft>) => {
                setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)));
        };

        const removeGroup = (key: string) => {
                setGroups((prev) => prev.filter((g) => g.key !== key));
        };

        const addOption = (groupKey: string) => {
                setGroups((prev) =>
                        prev.map((g) => {
                                if (g.key !== groupKey) return g;
                                if (g.options.length >= MAX_OPTIONS_PER_GROUP) {
                                        premiumToast('error', `الحد الأقصى ${MAX_OPTIONS_PER_GROUP} خيارًا لكل مجموعة`);
                                        return g;
                                }
                                return {
                                        ...g,
                                        options: [
                                                ...g.options,
                                                {
                                                        key: nextDraftKey('o'),
                                                        nameAr: '',
                                                        name: '',
                                                        priceDelta: '0',
                                                        isAvailable: true,
                                                        sortOrder: g.options.length,
                                                },
                                        ],
                                };
                        })
                );
        };

        const updateOption = (groupKey: string, optionKey: string, patch: Partial<OptionDraft>) => {
                setGroups((prev) =>
                        prev.map((g) =>
                                g.key !== groupKey
                                        ? g
                                        : {
                                                  ...g,
                                                  options: g.options.map((o) =>
                                                          o.key === optionKey ? { ...o, ...patch } : o
                                                  ),
                                          }
                        )
                );
        };

        const removeOption = (groupKey: string, optionKey: string) => {
                setGroups((prev) =>
                        prev.map((g) =>
                                g.key !== groupKey
                                        ? g
                                        : { ...g, options: g.options.filter((o) => o.key !== optionKey) }
                        )
                );
        };

        /** Validates drafts and maps them to the API payload (null + toast on any bad draft). */
        const buildModifierGroupsPayload = (): ModifierGroupPayload[] | null => {
                const out: ModifierGroupPayload[] = [];
                for (const [gi, g] of groups.entries()) {
                        const nameAr = g.nameAr.trim();
                        if (!nameAr) {
                                premiumToast('error', `اسم المجموعة رقم ${toArabicNumber(gi + 1)} مطلوب`);
                                return null;
                        }
                        const minSelect = g.minSelect.trim() === '' ? 0 : Number(g.minSelect);
                        const maxSelect = g.maxSelect.trim() === '' ? 1 : Number(g.maxSelect);
                        if (
                                !Number.isInteger(minSelect) || !Number.isInteger(maxSelect) ||
                                minSelect < 0 || maxSelect < 1 || minSelect > 10 || maxSelect > 10
                        ) {
                                premiumToast('error', `حدود الاختيار في «${nameAr}» يجب أن تكون أرقامًا صحيحة (0–10)`);
                                return null;
                        }
                        if (minSelect > maxSelect) {
                                premiumToast('error', `الحد الأدنى في «${nameAr}» لا يمكن أن يتجاوز الحد الأقصى`);
                                return null;
                        }
                        const options: ModifierGroupPayload['options'] = [];
                        for (const [oi, o] of g.options.entries()) {
                                const oName = o.nameAr.trim();
                                if (!oName) {
                                        premiumToast('error', `اسم الخيار رقم ${toArabicNumber(oi + 1)} في «${nameAr}» مطلوب`);
                                        return null;
                                }
                                const delta = o.priceDelta.trim() === '' ? 0 : Number(o.priceDelta);
                                if (!Number.isFinite(delta)) {
                                        premiumToast('error', `سعر الخيار «${oName}» غير صالح`);
                                        return null;
                                }
                                options.push({
                                        id: o.id,
                                        nameAr: oName,
                                        name: o.name.trim() || undefined,
                                        priceDelta: delta,
                                        isAvailable: o.isAvailable,
                                        sortOrder: Number.isFinite(Number(o.sortOrder)) ? o.sortOrder : oi,
                                });
                        }
                        out.push({
                                id: g.id,
                                nameAr,
                                name: g.name.trim() || undefined,
                                minSelect,
                                maxSelect,
                                required: g.required,
                                sortOrder: Number.isFinite(Number(g.sortOrder)) ? Number(g.sortOrder) : gi,
                                options,
                        });
                }
                return out;
        };

        // Reset form when dialog opens
        useEffect(() => {
                if (open) {
                        setBadgeDraft('');
                        setGroups(groupsFromItem(editing?.modifierGroups));
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
                // w3-f1 (F1-3): validate + map drafts BEFORE the request — a bad
                // draft aborts the save with a specific Arabic reason (no partial write).
                const modifierGroupsPayload = buildModifierGroupsPayload();
                if (groups.length > 0 && !modifierGroupsPayload) return;
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
                                // w3-f1 (F1-3): the complete group list — POST creates them
                                // nested; PUT replaces (deleteMany + create). Sent ALWAYS when
                                // the owner configured any (and as [] when they cleared all —
                                // an explicit empty list must wipe the stored groups).
                                modifierGroups: groups.length > 0 ? modifierGroupsPayload : [],
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

                                        {/* w3-f1 (F1-3) — modifier groups editor. Draft list is sent
                                                wholesale on save: POST creates nested, PUT replaces. Fieldsets +
                                                wired labels keep the axe label-control rule (round86-C9). */}
                                        <div className="rounded-md border border-border/40 p-3 space-y-3">
                                                <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                                <span id={`${fId}-mods`} className="text-sm font-medium leading-none block">
                                                                        مجموعات الخيارات (المعدِّلات)
                                                                </span>
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                        اختيارات يحددها الزبون عند الطلب — مثل الحجم أو الإضافات، وكل خيار يضيف سعره لسعر الصنف
                                                                </p>
                                                        </div>
                                                        <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={addGroup}
                                                                className="h-10 shrink-0 gap-1 border-orange/30 text-orange hover:bg-orange-muted"
                                                                aria-label="إضافة مجموعة خيارات"
                                                        >
                                                                <Plus className="size-3.5" aria-hidden="true" /> إضافة مجموعة
                                                        </Button>
                                                </div>
                                                {groups.length === 0 && (
                                                        <p className="text-xs text-muted-foreground/70">
                                                                لا توجد مجموعات بعد — «إضافة مجموعة» تبدأ مجموعة مثل «الحجم» بخياراتها وأسعارها
                                                        </p>
                                                )}
                                                <div className="space-y-3">
                                                        {groups.map((g, gi) => (
                                                                <fieldset
                                                                        key={g.key}
                                                                        className="rounded-md border border-border/40 bg-muted/20 p-3 space-y-2.5"
                                                                        aria-label={`مجموعة الخيارات رقم ${toArabicNumber(gi + 1)}`}
                                                                >
                                                                        <div className="flex items-center justify-between gap-2">
                                                                                <span className="text-xs font-bold text-muted-foreground">
                                                                                        مجموعة {toArabicNumber(gi + 1)}
                                                                                </span>
                                                                                <button
                                                                                        type="button"
                                                                                        onClick={() => removeGroup(g.key)}
                                                                                        className="inline-flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 rounded-md px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                                                                                        aria-label={`حذف مجموعة ${g.nameAr || gi + 1}`}
                                                                                >
                                                                                        <Trash2 className="size-3" aria-hidden="true" /> حذف المجموعة
                                                                                </button>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2.5">
                                                                                <div>
                                                                                        <Label htmlFor={`${fId}-gname-${g.key}`}>اسم المجموعة</Label>
                                                                                        <Input
                                                                                                id={`${fId}-gname-${g.key}`}
                                                                                                value={g.nameAr}
                                                                                                onChange={(e) => updateGroup(g.key, { nameAr: e.target.value })}
                                                                                                placeholder="الحجم"
                                                                                                maxLength={60}
                                                                                                className="h-10 rounded-md mt-1.5"
                                                                                        />
                                                                                </div>
                                                                                <div>
                                                                                        <Label htmlFor={`${fId}-gnameen-${g.key}`}>الاسم بالإنجليزية</Label>
                                                                                        <Input
                                                                                                id={`${fId}-gnameen-${g.key}`}
                                                                                                value={g.name}
                                                                                                onChange={(e) => updateGroup(g.key, { name: e.target.value })}
                                                                                                placeholder="اختياري — بالإنجليزية"
                                                                                                maxLength={60}
                                                                                                className="h-10 rounded-md mt-1.5 text-start"
                                                                                                dir="ltr"
                                                                                        />
                                                                                </div>
                                                                        </div>
                                                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 items-center">
                                                                                <div>
                                                                                        <Label htmlFor={`${fId}-gmin-${g.key}`}>الحد الأدنى</Label>
                                                                                        <Input
                                                                                                id={`${fId}-gmin-${g.key}`}
                                                                                                type="number"
                                                                                                min={0}
                                                                                                max={10}
                                                                                                value={g.minSelect}
                                                                                                onChange={(e) => updateGroup(g.key, { minSelect: e.target.value })}
                                                                                                className="h-10 rounded-md mt-1.5 tabular-nums"
                                                                                        />
                                                                                </div>
                                                                                <div>
                                                                                        <Label htmlFor={`${fId}-gmax-${g.key}`}>الحد الأقصى</Label>
                                                                                        <Input
                                                                                                id={`${fId}-gmax-${g.key}`}
                                                                                                type="number"
                                                                                                min={1}
                                                                                                max={10}
                                                                                                value={g.maxSelect}
                                                                                                onChange={(e) => updateGroup(g.key, { maxSelect: e.target.value })}
                                                                                                className="h-10 rounded-md mt-1.5 tabular-nums"
                                                                                        />
                                                                                </div>
                                                                                <div>
                                                                                        <Label htmlFor={`${fId}-gsort-${g.key}`}>الترتيب</Label>
                                                                                        <Input
                                                                                                id={`${fId}-gsort-${g.key}`}
                                                                                                type="number"
                                                                                                min={0}
                                                                                                value={g.sortOrder}
                                                                                                onChange={(e) => updateGroup(g.key, { sortOrder: e.target.value })}
                                                                                                className="h-10 rounded-md mt-1.5 tabular-nums"
                                                                                        />
                                                                                </div>
                                                                                <div className="flex items-center justify-between sm:justify-start sm:gap-2 pt-4">
                                                                                        <Label htmlFor={`${fId}-greq-${g.key}`} className="mb-0">إلزامية</Label>
                                                                                        <Switch
                                                                                                id={`${fId}-greq-${g.key}`}
                                                                                                checked={g.required}
                                                                                                onCheckedChange={(v) => updateGroup(g.key, { required: v })}
                                                                                                aria-label="المجموعة إلزامية"
                                                                                        />
                                                                                </div>
                                                                        </div>
                                                                        {/* Options list */}
                                                                        <div className="space-y-2">
                                                                                <span className="text-xs font-medium text-muted-foreground block">الخيارات</span>
                                                                                {g.options.length === 0 && (
                                                                                        <p className="text-[11px] text-muted-foreground/70">
                                                                                                لا توجد خيارات — أضف خيارًا واحدًا على الأقل ليظهر للزبائن
                                                                                        </p>
                                                                                )}
                                                                                {g.options.map((o, oi) => (
                                                                                        <div
                                                                                                key={o.key}
                                                                                                className="flex flex-wrap items-end gap-2 rounded-md border border-border/30 bg-background/60 p-2"
                                                                                        >
                                                                                                <div className="flex-1 min-w-[140px]">
                                                                                                        <Label htmlFor={`${fId}-oname-${o.key}`} className="text-[11px]">
                                                                                                                الخيار {toArabicNumber(oi + 1)}
                                                                                                        </Label>
                                                                                                        <Input
                                                                                                                id={`${fId}-oname-${o.key}`}
                                                                                                                value={o.nameAr}
                                                                                                                onChange={(e) => updateOption(g.key, o.key, { nameAr: e.target.value })}
                                                                                                                placeholder="مثال: كبير"
                                                                                                                maxLength={60}
                                                                                                                className="h-10 rounded-md mt-1"
                                                                                                        />
                                                                                                </div>
                                                                                                <div className="w-28">
                                                                                                        <Label htmlFor={`${fId}-oprice-${o.key}`} className="text-[11px]">
                                                                                                                السعر ± (د.ل)
                                                                                                        </Label>
                                                                                                        <Input
                                                                                                                id={`${fId}-oprice-${o.key}`}
                                                                                                                type="number"
                                                                                                                step="0.5"
                                                                                                                value={o.priceDelta}
                                                                                                                onChange={(e) => updateOption(g.key, o.key, { priceDelta: e.target.value })}
                                                                                                                placeholder="0"
                                                                                                                className="h-10 rounded-md mt-1 tabular-nums"
                                                                                                        />
                                                                                                </div>
                                                                                                <div className="flex items-center gap-1.5 pb-1.5">
                                                                                                        <Switch
                                                                                                                id={`${fId}-oavail-${o.key}`}
                                                                                                                checked={o.isAvailable}
                                                                                                                onCheckedChange={(v) => updateOption(g.key, o.key, { isAvailable: v })}
                                                                                                                aria-label={`توفر الخيار رقم ${toArabicNumber(oi + 1)}`}
                                                                                                        />
                                                                                                        <Label htmlFor={`${fId}-oavail-${o.key}`} className="text-[11px] mb-0">
                                                                                                                متاح
                                                                                                        </Label>
                                                                                                </div>
                                                                                                <button
                                                                                                        type="button"
                                                                                                        onClick={() => removeOption(g.key, o.key)}
                                                                                                        className="size-10 shrink-0 rounded-md border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors mb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                                                                                                        aria-label={`حذف الخيار رقم ${toArabicNumber(oi + 1)}`}
                                                                                                >
                                                                                                        <Trash2 className="size-3.5" aria-hidden="true" />
                                                                                                </button>
                                                                                        </div>
                                                                                ))}
                                                                                <Button
                                                                                        type="button"
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() => addOption(g.key)}
                                                                                        className="h-9 gap-1 text-xs"
                                                                                        aria-label={`إضافة خيار إلى المجموعة رقم ${toArabicNumber(gi + 1)}`}
                                                                                >
                                                                                        <Plus className="size-3" aria-hidden="true" /> إضافة خيار
                                                                                </Button>
                                                                        </div>
                                                                </fieldset>
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
