'use client';
/*
 * item-dialog/use-modifier-groups.ts — round94 W2-b (inspection-c §2.5):
 * the modifier-group editor state lifted VERBATIM from ItemDialog.tsx
 * (state line 182 + the six draft handlers 196–273). reset() and
 * buildPayload() are the two named call-sites the reset effect / save used
 * to reach inline (source lines 336 and 279).
 */

import { useState } from 'react';
import type { GroupDraft, ItemModifierGroup, ModifierGroupPayload, OptionDraft } from './types';
import { MAX_MODIFIER_GROUPS, MAX_OPTIONS_PER_GROUP } from './types';
import { buildModifierGroupsPayload, groupsFromItem, nextDraftKey } from './modifier-draft-utils';
import { premiumToast } from '@/lib/premium-toast';

export function useModifierGroups(): {
        groups: GroupDraft[];
        addGroup: () => void;
        updateGroup: (key: string, patch: Partial<GroupDraft>) => void;
        removeGroup: (key: string) => void;
        addOption: (groupKey: string) => void;
        updateOption: (groupKey: string, optionKey: string, patch: Partial<OptionDraft>) => void;
        removeOption: (groupKey: string, optionKey: string) => void;
        /** = setGroups(groupsFromItem(source)) — source line 336 of the old dialog. */
        reset: (source: ItemModifierGroup[] | undefined) => void;
        /** = buildModifierGroupsPayload(groups) — source line 279 of the old dialog. */
        buildPayload: () => ModifierGroupPayload[] | null;
} {
        // w3-f1 (F1-3): modifier-group editor state (draft list)
        const [groups, setGroups] = useState<GroupDraft[]>([]);

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
                setGroups((prev) =>
                        prev.map((g) => {
                                if (g.key !== key) return g;
                                const next = { ...g, ...patch };
                                // r109-F9: keep «إلزامية» and «الحد الأدنى» coherent in BOTH
                                // directions — the public dialog enforces minSelect>0 only;
                                // required:true with minSelect:0 used to render «اختياري» and
                                // accept orders without the modifier (live-proven r108).
                                if (patch.required === true && Number(next.minSelect) < 1) next.minSelect = '1';
                                if (patch.required === false && Number(next.minSelect) === 1) next.minSelect = '0';
                                if (patch.minSelect !== undefined) {
                                        const m = Number(next.minSelect);
                                        if (m > 0 && !next.required) next.required = true;
                                        if (m <= 0 && next.required) next.required = false;
                                }
                                return next;
                        })
                );
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
                                                        options: g.options.map((o) => (o.key === optionKey ? { ...o, ...patch } : o)),
                                                }
                        )
                );
        };

        const removeOption = (groupKey: string, optionKey: string) => {
                setGroups((prev) =>
                        prev.map((g) =>
                                g.key !== groupKey ? g : { ...g, options: g.options.filter((o) => o.key !== optionKey) }
                        )
                );
        };

        const reset = (source: ItemModifierGroup[] | undefined) => {
                setGroups(groupsFromItem(source));
        };

        const buildPayload = () => buildModifierGroupsPayload(groups);

        return {
                groups,
                addGroup,
                updateGroup,
                removeGroup,
                addOption,
                updateOption,
                removeOption,
                reset,
                buildPayload,
        };
}
