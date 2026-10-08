'use client';
/*
 * item-dialog/ModifierOptionRow.tsx — round94 W2-b (inspection-c §2.4):
 * JSX moved VERBATIM from ItemDialog.tsx 743–795 (one option row).
 * The outer `div class="flex flex-wrap items-end gap-2 rounded-md border
 * border-border/30 bg-background/60 p-2"` is a FROZEN structural selector —
 * team11 targets `div.flex-wrap.items-end` (.last()) — do not restructure.
 * Replacements: g.key→groupKey, o.key→option.key, oi→index.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
import { toArabicNumber } from '@/lib/format';
import type { OptionDraft } from './types';

export function ModifierOptionRow({
        fId,
        groupKey,
        option,
        index,
        onUpdateOption,
        onRemoveOption,
}: {
        fId: string;
        groupKey: string;
        option: OptionDraft;
        /** = oi — used in toArabicNumber(index+1) and the aria labels. */
        index: number;
        onUpdateOption: (groupKey: string, optionKey: string, patch: Partial<OptionDraft>) => void;
        onRemoveOption: (groupKey: string, optionKey: string) => void;
}) {
        return (
                <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/30 bg-background/60 p-2">
                        <div className="flex-1 min-w-[140px]">
                                <Label htmlFor={`${fId}-oname-${option.key}`} className="text-2xs">
                                        الخيار {toArabicNumber(index + 1)}
                                </Label>
                                <Input
                                        id={`${fId}-oname-${option.key}`}
                                        value={option.nameAr}
                                        onChange={(e) => onUpdateOption(groupKey, option.key, { nameAr: e.target.value })}
                                        placeholder="مثال: كبير"
                                        maxLength={60}
                                        className="h-10 rounded-lg mt-1"
                                />
                        </div>
                        <div className="w-28">
                                <Label htmlFor={`${fId}-oprice-${option.key}`} className="text-2xs">
                                        السعر ± (د.ل)
                                </Label>
                                <Input
                                        id={`${fId}-oprice-${option.key}`}
                                        type="number"
                                        step="0.5"
                                        value={option.priceDelta}
                                        onChange={(e) => onUpdateOption(groupKey, option.key, { priceDelta: e.target.value })}
                                        placeholder="0"
                                        className="h-10 rounded-lg mt-1 tabular-nums"
                                />
                        </div>
                        <div className="flex items-center gap-1.5 pb-1.5">
                                <Switch
                                        id={`${fId}-oavail-${option.key}`}
                                        checked={option.isAvailable}
                                        onCheckedChange={(v) => onUpdateOption(groupKey, option.key, { isAvailable: v })}
                                        aria-label={`توفر الخيار رقم ${toArabicNumber(index + 1)}`}
                                />
                                <Label htmlFor={`${fId}-oavail-${option.key}`} className="text-2xs mb-0">
                                        متاح
                                </Label>
                        </div>
                        <button
                                type="button"
                                onClick={() => onRemoveOption(groupKey, option.key)}
                                className="size-10 shrink-0 rounded-md border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors mb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                                aria-label={`حذف الخيار رقم ${toArabicNumber(index + 1)}`}
                        >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                </div>
        );
}
