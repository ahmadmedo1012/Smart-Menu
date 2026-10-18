'use client';
/*
 * item-dialog/use-item-save.ts — round94 W2-b (inspection-c §2.5):
 * the save flow lifted VERBATIM from ItemDialog.tsx (360–444) — guard,
 * validation ORDER (name/price → image URL → featuredRank → modifier
 * payloads), the round88-C request-body semantics, csrfFetch PUT/POST,
 * Arabic toasts, close + onSaved. Dependencies arrive as args (no
 * useCallback — identity semantics match the old per-render closure).
 */

import { useState } from 'react';
import { csrfFetch } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';
import { MAX_MENU_PRICE, MAX_MENU_PRICE_MESSAGE } from '@/lib/constants';
import type { GroupDraft, Item, ItemFormState, ModifierGroupPayload } from './types';
import { IMAGE_URL_RE } from './types';

export interface UseItemSaveArgs {
        editing: Item | null;
        form: ItemFormState;
        groups: GroupDraft[];
        /** from useModifierGroups */
        buildPayload: () => ModifierGroupPayload[] | null;
        onOpenChange: (o: boolean) => void;
        onSaved: () => void;
}

export function useItemSave({
        editing,
        form,
        groups,
        buildPayload,
        onOpenChange,
        onSaved,
}: UseItemSaveArgs): {
        saving: boolean;
        save: () => Promise<void>;
} {
        const [saving, setSaving] = useState(false);

        const save = async () => {
                if (saving) return;
                /* r138 (W5-C3 — حكم تدقيق W5-A3 P3): الصفر مسموح — الحكم
                   الموثّق: إصلاح الخادم 6e702c24 جعل price=0 قانونياً (صنف
                   مجاني)، وdiscountedPrice=0 = مجاني 100% منذ r118-A3-P2-3.
                   كان !form.price يرفض 0 ويربك المالك برسالة «أدخل الاسم
                   والسعر» على حقل مملوء بالصفر. الحارس الآن يميّز «فارغ»
                   (NaN — الحقل مسح/لم يُلمس) عن «صفر» (قيمة صادقة).
                   الحدان (السالب/الأعلى) يطابقان zod الخادم حرفيًا. */
                if (!form.name.trim() || !Number.isFinite(form.price)) {
                        premiumToast('error', 'يرجى إدخال الاسم والسعر');
                        return;
                }
                if (form.price < 0) {
                        premiumToast('error', 'السعر يجب أن يكون 0 أو أكثر');
                        return;
                }
                if (form.price > MAX_MENU_PRICE) {
                        premiumToast('error', MAX_MENU_PRICE_MESSAGE);
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
                const modifierGroupsPayload = buildPayload();
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
                                        ? form.featuredRank
                                                ? Number(form.featuredRank)
                                                : null
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
                                let errMsg = 'تعذّر الحفظ';
                                try {
                                        const e = await res.json();
                                        errMsg = e?.error || errMsg;
                                        // r118-A5-F6: raw zod details are ENGLISH ("String must contain at
                                        // most 100 character(s)") and used to be appended to the Arabic
                                        // toast verbatim. The inputs are now capped client-side
                                        // (maxLength 100/1000), so this only fires on genuinely unexpected
                                        // shapes — keep the toast fully Arabic.
                                        if (e?.details?.length) errMsg += ' — تحقق من الحقول وأعد المحاولة';
                                } catch {}
                                throw new Error(errMsg);
                        }
                        premiumToast('save', editing ? 'تم تحديث الصنف' : 'تمت إضافة الصنف');
                        onOpenChange(false);
                        onSaved();
                } catch (e) {
                        premiumToast('error', e instanceof Error ? e.message : 'تعذّر الحفظ');
                } finally {
                        setSaving(false);
                }
        };

        return { saving, save };
}
