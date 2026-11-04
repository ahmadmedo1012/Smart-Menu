'use client';
/*
 * item-dialog/use-modifier-templates.ts — P43 SM-1b.
 *
 * جلب قوالب الإضافات (لكل مطعم) + حفظ/إعادة تسمية/حذف — كل الطلبات عبر
 * csrfJson (الملكية تُفرض خادميًا في /api/modifier-templates). التحميل
 * كسول: أول فتح للوحة القوالب يستدعي load() مرة (لا fetch عند كل فتح حوار).
 */

import { useCallback, useState } from 'react';
import { csrfJson } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import type { ModifierGroupPayload } from './types';

/** صف القالب كما يعيده GET /api/modifier-templates (اللقطة كاملة). */
export interface ModifierTemplateRow {
        id: number;
        nameAr: string;
        name: string;
        groupsJson: string;
        createdAt: string;
}

/** مجموعة القالب كما تُخزَّن في groupsJson (بلا معرفات — نسخة نقية). */
export interface TemplateGroupSnapshot {
        nameAr: string;
        name: string;
        minSelect: number;
        maxSelect: number;
        required: boolean;
        sortOrder: number;
        options: Array<{
                nameAr: string;
                name: string;
                priceDelta: number;
                isAvailable: boolean;
                sortOrder: number;
        }>;
}

/** تفكيك defensive للقطة — JSON تالف يعيد [] (الواجهة لا تنكسر على صف قديم). */
export function parseTemplateGroups(json: string): TemplateGroupSnapshot[] {
        try {
                const parsed = JSON.parse(json);
                return Array.isArray(parsed) ? (parsed as TemplateGroupSnapshot[]) : [];
        } catch {
                return [];
        }
}

export function useModifierTemplates(restaurantId: number): {
        templates: ModifierTemplateRow[];
        loading: boolean;
        /** أول استدعاء يجلب؛ الاستدعاءات اللاحقة تجلب من جديد (بعد حفظ/حذف). */
        load: () => Promise<void>;
        /** true بعد أول load ناجح (لواجهة «لا توجد قوالب بعد»). */
        loadedOnce: boolean;
        saveTemplate: (nameAr: string, groups: ModifierGroupPayload[]) => Promise<boolean>;
        renameTemplate: (id: number, nameAr: string) => Promise<boolean>;
        deleteTemplate: (id: number) => Promise<boolean>;
} {
        const [templates, setTemplates] = useState<ModifierTemplateRow[]>([]);
        const [loading, setLoading] = useState(false);
        const [loadedOnce, setLoadedOnce] = useState(false);

        const load = useCallback(async () => {
                if (!restaurantId) return;
                setLoading(true);
                try {
                        const j = await csrfJson<{ success: boolean; data?: ModifierTemplateRow[] }>(
                                `/api/modifier-templates?restaurantId=${restaurantId}`
                        );
                        setTemplates(Array.isArray(j?.data) ? j.data : []);
                        setLoadedOnce(true);
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر تحميل القوالب'));
                } finally {
                        setLoading(false);
                }
        }, [restaurantId]);

        const saveTemplate = useCallback(
                async (nameAr: string, groups: ModifierGroupPayload[]): Promise<boolean> => {
                        if (!restaurantId) return false;
                        if (!nameAr.trim()) {
                                premiumToast('error', 'اسم القالب مطلوب');
                                return false;
                        }
                        if (groups.length === 0) {
                                premiumToast('error', 'أضف مجموعة واحدة على الأقل قبل الحفظ كقالب');
                                return false;
                        }
                        try {
                                await csrfJson('/api/modifier-templates', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ restaurantId, nameAr: nameAr.trim(), groups }),
                                });
                                premiumToast('save', 'تم حفظ القالب');
                                await load();
                                return true;
                        } catch (e) {
                                premiumToast('error', getErrorMessage(e, 'تعذّر حفظ القالب'));
                                return false;
                        }
                },
                [restaurantId, load]
        );

        const renameTemplate = useCallback(async (id: number, nameAr: string): Promise<boolean> => {
                if (!nameAr.trim()) {
                        premiumToast('error', 'اسم القالب مطلوب');
                        return false;
                }
                try {
                        await csrfJson(`/api/modifier-templates/${id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ nameAr: nameAr.trim() }),
                        });
                        premiumToast('save', 'تم تحديث اسم القالب');
                        return true;
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر التحديث'));
                        return false;
                }
        }, []);

        const deleteTemplate = useCallback(async (id: number): Promise<boolean> => {
                try {
                        await csrfJson(`/api/modifier-templates/${id}`, { method: 'DELETE' });
                        premiumToast('trash', 'تم حذف القالب');
                        return true;
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر الحذف'));
                        return false;
                }
        }, []);

        return { templates, loading, load, loadedOnce, saveTemplate, renameTemplate, deleteTemplate };
}
