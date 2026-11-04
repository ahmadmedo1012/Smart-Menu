'use client';
/*
 * item-dialog/ModifierTemplatesPanel.tsx — P43 SM-1b (قوالب الإضافات).
 *
 * لوحة مدمجة داخل محرر مجموعات الخيارات:
 *   * «إدراج من قوالب» — قائمة قوالب المطعم، الإدراج يُلحق نسخة من
 *     مجموعات القالب بالمجموعات الحالية (لا استبدال — لا خسارة عمل).
 *   * «حفظ كقالب» — يخزّن المجموعات الحالية باسم يختاره المالك.
 *   * إدارة القوالب — إعادة تسمية/حذف داخل القائمة نفسها.
 *
 * دلالات النسخ موثّقة في الواجهة صراحة: «الإدراج ينسخ المجموعات، التعديلات
 * اللاحقة على القالب لا تؤثر على الصنف» (لقطة groupsJson — لا روابط).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layers, Pencil, Plus } from 'lucide-react';
import AnimatedTrash from '@/components/ui/trash-icon';
import { toArabicNumber } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';
import { useModifierTemplates, parseTemplateGroups } from './use-modifier-templates';
import type { ModifierGroupPayload } from './types';

export function ModifierTemplatesPanel({
        restaurantId,
        buildPayload,
        onInsert,
}: {
        restaurantId: number;
        /** من useModifierGroups — يُستدعى فقط عند «حفظ كقالب» (تحقق كامل). */
        buildPayload: () => ModifierGroupPayload[] | null;
        /** إدراج نسخة القالب في المجموعات الحالية (useModifierGroups.importGroups). */
        onInsert: (groups: ReturnType<typeof parseTemplateGroups>) => void;
}) {
        const [open, setOpen] = useState(false);
        const [saveOpen, setSaveOpen] = useState(false);
        const [nameDraft, setNameDraft] = useState('');
        const [renamingId, setRenamingId] = useState<number | null>(null);
        const [renameDraft, setRenameDraft] = useState('');
        const { templates, loading, load, saveTemplate, renameTemplate, deleteTemplate } =
                useModifierTemplates(restaurantId);

        const handleToggle = () => {
                const next = !open;
                setOpen(next);
                if (next) void load();
        };

        const handleSave = async () => {
                const payload = buildPayload();
                if (!payload || payload.length === 0) return; // buildPayload يعرض التوست العربي بنفسه
                const ok = await saveTemplate(nameDraft, payload);
                if (ok) {
                        setNameDraft('');
                        setSaveOpen(false);
                }
        };

        const handleInsert = (groupsJson: string) => {
                onInsert(parseTemplateGroups(groupsJson));
        };

        const handleRenameSave = async (id: number) => {
                const ok = await renameTemplate(id, renameDraft);
                if (ok) {
                        setRenamingId(null);
                        setRenameDraft('');
                        void load();
                }
        };

        const handleDelete = async (id: number) => {
                const ok = await deleteTemplate(id);
                if (ok) void load();
        };

        return (
                <div className="rounded-md border border-border/30 bg-muted/10 p-2 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleToggle}
                                        aria-expanded={open}
                                        className="gap-1"
                                >
                                        <Layers className="size-3.5" aria-hidden="true" />
                                        {open ? 'إخفاء القوالب' : 'إدراج من قوالب'}
                                </Button>
                                <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSaveOpen((v) => !v)}
                                        aria-expanded={saveOpen}
                                        className="gap-1"
                                >
                                        <Plus className="size-3.5" aria-hidden="true" />
                                        حفظ كقالب
                                </Button>
                                <span className="text-2xs text-muted-foreground">
                                        القوالب خاصة بمطعمك وتُنسخ عند الإدراج — تعديل القالب لاحقًا لا يغيّر الأصناف
                                </span>
                        </div>

                        {saveOpen && (
                                <div className="flex flex-wrap items-center gap-1.5 animate-fade-in">
                                        <Input
                                                value={nameDraft}
                                                onChange={(e) => setNameDraft(e.target.value)}
                                                placeholder="اسم القالب — مثل «الحجم والحليب»"
                                                maxLength={60}
                                                className="max-w-64 h-9"
                                                aria-label="اسم القالب"
                                        />
                                        <Button type="button" variant="orange" size="sm" onClick={handleSave}>
                                                حفظ القالب
                                        </Button>
                                </div>
                        )}

                        {open && (
                                <div className="animate-fade-in">
                                        {loading && templates.length === 0 && (
                                                <p className="text-xs text-muted-foreground px-1">جارٍ تحميل القوالب…</p>
                                        )}
                                        {!loading && templates.length === 0 && (
                                                <p className="text-xs text-muted-foreground px-1">
                                                        لا توجد قوالب بعد — رتّب مجموعات الصنف ثم «حفظ كقالب» لإعادة استخدامها
                                                </p>
                                        )}
                                        {templates.length > 0 && (
                                                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                                                        {templates.map((t) => {
                                                                const groupCount = parseTemplateGroups(t.groupsJson).length;
                                                                return (
                                                                        <li
                                                                                key={t.id}
                                                                                className="flex items-center gap-2 rounded-md border border-border/30 bg-card/60 px-2.5 py-1.5"
                                                                        >
                                                                                {renamingId === t.id ? (
                                                                                        <>
                                                                                                <Input
                                                                                                        value={renameDraft}
                                                                                                        onChange={(e) => setRenameDraft(e.target.value)}
                                                                                                        maxLength={60}
                                                                                                        className="h-8 max-w-48"
                                                                                                        aria-label={`اسم جديد للقالب ${t.nameAr}`}
                                                                                                />
                                                                                                <Button
                                                                                                        type="button"
                                                                                                        variant="orange"
                                                                                                        size="sm"
                                                                                                        onClick={() => handleRenameSave(t.id)}
                                                                                                >
                                                                                                        حفظ
                                                                                                </Button>
                                                                                                <Button
                                                                                                        type="button"
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        onClick={() => setRenamingId(null)}
                                                                                                >
                                                                                                        إلغاء
                                                                                                </Button>
                                                                                        </>
                                                                                ) : (
                                                                                        <>
                                                                                                <span className="text-sm font-medium min-w-0 truncate">{t.nameAr}</span>
                                                                                                <span className="text-2xs text-muted-foreground shrink-0">
                                                                                                        {toArabicNumber(groupCount)}{' '}
                                                                                                        {getArabicPlural(groupCount, 'مجموعة', 'مجموعتان', 'مجموعات')}
                                                                                                </span>
                                                                                                <div className="flex items-center gap-0.5 ms-auto shrink-0">
                                                                                                        <Button
                                                                                                                type="button"
                                                                                                                variant="ghost"
                                                                                                                size="icon"
                                                                                                                className="h-8 w-8 text-accent-foreground"
                                                                                                                onClick={() => handleInsert(t.groupsJson)}
                                                                                                                title="إدراج نسخة من هذه المجموعات في الصنف"
                                                                                                                aria-label={`إدراج القالب ${t.nameAr}`}
                                                                                                        >
                                                                                                                <Plus className="size-3.5" />
                                                                                                        </Button>
                                                                                                        <Button
                                                                                                                type="button"
                                                                                                                variant="ghost"
                                                                                                                size="icon"
                                                                                                                className="h-8 w-8"
                                                                                                                onClick={() => {
                                                                                                                        setRenamingId(t.id);
                                                                                                                        setRenameDraft(t.nameAr);
                                                                                                                }}
                                                                                                                title="إعادة تسمية"
                                                                                                                aria-label={`إعادة تسمية القالب ${t.nameAr}`}
                                                                                                        >
                                                                                                                <Pencil className="size-3.5" />
                                                                                                        </Button>
                                                                                                        <Button
                                                                                                                type="button"
                                                                                                                variant="ghost"
                                                                                                                size="icon"
                                                                                                                className="h-8 w-8 text-destructive"
                                                                                                                onClick={() => handleDelete(t.id)}
                                                                                                                title="حذف القالب (لا يؤثر على الأصناف)"
                                                                                                                aria-label={`حذف القالب ${t.nameAr}`}
                                                                                                        >
                                                                                                                <AnimatedTrash className="size-3.5" />
                                                                                                        </Button>
                                                                                                </div>
                                                                                        </>
                                                                                )}
                                                                        </li>
                                                                );
                                                        })}
                                                </ul>
                                        )}
                                </div>
                        )}
                </div>
        );
}
