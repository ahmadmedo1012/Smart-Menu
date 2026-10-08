'use client';
/*
 * item-dialog/DietaryAllergensSection.tsx — round94 W2-b (inspection-c §2.4):
 * JSX moved VERBATIM from ItemDialog.tsx 907–969 (dietary + allergen toggle
 * chips). The inline setForm bodies became the onToggleDietary/onToggleAllergen
 * callbacks (lifted into useItemForm). Sanctioned id fixes: the broken span
 * ids at old lines 909/941 (`id={"`${fId}-dietary`"}` etc. printed literally)
 * are now real template literals.
 */

import { AlertTriangle } from 'lucide-react';
import {
        DIETARY_OPTIONS,
        ALLERGEN_OPTIONS,
        DIETARY_LABELS,
        ALLERGEN_LABELS,
} from '@/lib/dietary';
import { DietaryIcon } from '@/components/menu/dietary-icons';
import { cn } from '@/lib/utils';

export function DietaryAllergensSection({
        fId,
        dietaryTags,
        allergens,
        onToggleDietary,
        onToggleAllergen,
}: {
        fId: string;
        dietaryTags: string[];
        allergens: string[];
        onToggleDietary: (t: string) => void;
        onToggleAllergen: (t: string) => void;
}) {
        return (
                <>
                        {/* Dietary tags */}
                        <div>
                                <span id={`${fId}-dietary`} className="text-sm font-medium leading-none block">
                                        شارات الطعام
                                </span>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {DIETARY_OPTIONS.map((t) => {
                                                const active = dietaryTags?.includes(t);
                                                return (
                                                        <button
                                                                key={t}
                                                                type="button"
                                                                onClick={() => onToggleDietary(t)}
                                                                className={cn(
                                                                        'text-2xs px-2 py-1 rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                        active
                                                                                ? 'bg-basil/15 border-basil/40 text-basil'
                                                                                : 'border-border/30 hover:border-basil/40 text-muted-foreground'
                                                                )}
                                                        >
                                                                <span className="inline-flex items-center gap-1"><DietaryIcon tag={t} className="size-3 shrink-0" />{DIETARY_LABELS[t] || t}</span>
                                                        </button>
                                                );
                                        })}
                                </div>
                        </div>

                        {/* Allergens */}
                        <div>
                                <span id={`${fId}-allergens`} className="text-sm font-medium leading-none block">
                                        مسببات الحساسية
                                </span>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {ALLERGEN_OPTIONS.map((t) => {
                                                const active = allergens?.includes(t);
                                                return (
                                                        <button
                                                                key={t}
                                                                type="button"
                                                                onClick={() => onToggleAllergen(t)}
                                                                className={cn(
                                                                        'text-2xs px-2 py-1 rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                        active
                                                                                ? 'bg-warning/15 border-warning/40 text-warning'
                                                                                : 'border-border/30 hover:border-warning/40 text-muted-foreground'
                                                                )}
                                                        >
                                                                <AlertTriangle className="size-3 inline-block me-1 text-warning" />
                                                                {ALLERGEN_LABELS[t] || t}
                                                        </button>
                                                );
                                        })}
                                </div>
                        </div>
                </>
        );
}
