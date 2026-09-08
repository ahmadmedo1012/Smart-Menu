'use client';
/*
 * item-dialog/ModifierGroupsEditor.tsx — round94 W2-b (inspection-c §2.4):
 * JSX moved VERBATIM from ItemDialog.tsx 616–643 (section header + «إضافة
 * مجموعة» button — aria-label frozen for team11) + 644–654 (empty state +
 * groups loop). Each fieldset renders via <ModifierGroupCard/>.
 */

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { GroupDraft, OptionDraft } from './types';
import { ModifierGroupCard } from './ModifierGroupCard';

export function ModifierGroupsEditor({
	fId,
	groups,
	onAddGroup,
	onRemoveGroup,
	onUpdateGroup,
	onAddOption,
	onUpdateOption,
	onRemoveOption,
}: {
	fId: string;
	groups: GroupDraft[];
	onAddGroup: () => void;
	onRemoveGroup: (key: string) => void;
	onUpdateGroup: (key: string, patch: Partial<GroupDraft>) => void;
	onAddOption: (groupKey: string) => void;
	onUpdateOption: (groupKey: string, optionKey: string, patch: Partial<OptionDraft>) => void;
	onRemoveOption: (groupKey: string, optionKey: string) => void;
}) {
	return (
		// w3-f1 (F1-3) — modifier groups editor. Draft list is sent
		// wholesale on save: POST creates nested, PUT replaces. Fieldsets +
		// wired labels keep the axe label-control rule (round86-C9).
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
					onClick={onAddGroup}
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
					<ModifierGroupCard
						key={g.key}
						fId={fId}
						group={g}
						index={gi}
						onUpdateGroup={onUpdateGroup}
						onRemoveGroup={onRemoveGroup}
						onAddOption={onAddOption}
						onUpdateOption={onUpdateOption}
						onRemoveOption={onRemoveOption}
					/>
				))}
			</div>
		</div>
	);
}
