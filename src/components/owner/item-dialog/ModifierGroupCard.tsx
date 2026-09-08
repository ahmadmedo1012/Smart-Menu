'use client';
/*
 * item-dialog/ModifierGroupCard.tsx — round94 W2-b (inspection-c §2.4):
 * JSX moved VERBATIM from ItemDialog.tsx 646–734 (group header/name/bounds/
 * required switch — Labels «الحد الأدنى»/«الحد الأقصى» are getByLabel-frozen,
 * team11) + 735–742 (options header/empty state) + 796–805 (add-option
 * button). Option rows render via <ModifierOptionRow/> (743–795).
 * Replacements: g.key→group.key, gi→index; handlers arrive as props.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { toArabicNumber } from '@/lib/format';
import type { GroupDraft, OptionDraft } from './types';
import { ModifierOptionRow } from './ModifierOptionRow';

export function ModifierGroupCard({
	fId,
	group,
	index,
	onUpdateGroup,
	onRemoveGroup,
	onAddOption,
	onUpdateOption,
	onRemoveOption,
}: {
	fId: string;
	group: GroupDraft;
	/** = gi — used in toArabicNumber(index+1) and the aria labels. */
	index: number;
	onUpdateGroup: (key: string, patch: Partial<GroupDraft>) => void;
	onRemoveGroup: (key: string) => void;
	onAddOption: (groupKey: string) => void;
	onUpdateOption: (groupKey: string, optionKey: string, patch: Partial<OptionDraft>) => void;
	onRemoveOption: (groupKey: string, optionKey: string) => void;
}) {
	return (
		<fieldset
			className="rounded-md border border-border/40 bg-muted/20 p-3 space-y-2.5"
			aria-label={`مجموعة الخيارات رقم ${toArabicNumber(index + 1)}`}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-bold text-muted-foreground">
					مجموعة {toArabicNumber(index + 1)}
				</span>
				<button
					type="button"
					onClick={() => onRemoveGroup(group.key)}
					className="inline-flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 rounded-md px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
					aria-label={`حذف مجموعة ${group.nameAr || index + 1}`}
				>
					<Trash2 className="size-3" aria-hidden="true" /> حذف المجموعة
				</button>
			</div>
			<div className="grid grid-cols-2 gap-2.5">
				<div>
					<Label htmlFor={`${fId}-gname-${group.key}`}>اسم المجموعة</Label>
					<Input
						id={`${fId}-gname-${group.key}`}
						value={group.nameAr}
						onChange={(e) => onUpdateGroup(group.key, { nameAr: e.target.value })}
						placeholder="الحجم"
						maxLength={60}
						className="h-10 rounded-md mt-1.5"
					/>
				</div>
				<div>
					<Label htmlFor={`${fId}-gnameen-${group.key}`}>الاسم بالإنجليزية</Label>
					<Input
						id={`${fId}-gnameen-${group.key}`}
						value={group.name}
						onChange={(e) => onUpdateGroup(group.key, { name: e.target.value })}
						placeholder="اختياري — بالإنجليزية"
						maxLength={60}
						className="h-10 rounded-md mt-1.5 text-start"
						dir="ltr"
					/>
				</div>
			</div>
			<div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 items-center">
				<div>
					<Label htmlFor={`${fId}-gmin-${group.key}`}>الحد الأدنى</Label>
					<Input
						id={`${fId}-gmin-${group.key}`}
						type="number"
						min={0}
						max={10}
						value={group.minSelect}
						onChange={(e) => onUpdateGroup(group.key, { minSelect: e.target.value })}
						className="h-10 rounded-md mt-1.5 tabular-nums"
					/>
				</div>
				<div>
					<Label htmlFor={`${fId}-gmax-${group.key}`}>الحد الأقصى</Label>
					<Input
						id={`${fId}-gmax-${group.key}`}
						type="number"
						min={1}
						max={10}
						value={group.maxSelect}
						onChange={(e) => onUpdateGroup(group.key, { maxSelect: e.target.value })}
						className="h-10 rounded-md mt-1.5 tabular-nums"
					/>
				</div>
				<div>
					<Label htmlFor={`${fId}-gsort-${group.key}`}>الترتيب</Label>
					<Input
						id={`${fId}-gsort-${group.key}`}
						type="number"
						min={0}
						value={group.sortOrder}
						onChange={(e) => onUpdateGroup(group.key, { sortOrder: e.target.value })}
						className="h-10 rounded-md mt-1.5 tabular-nums"
					/>
				</div>
				<div className="flex items-center justify-between sm:justify-start sm:gap-2 pt-4">
					<Label htmlFor={`${fId}-greq-${group.key}`} className="mb-0">
						إلزامية
					</Label>
					<Switch
						id={`${fId}-greq-${group.key}`}
						checked={group.required}
						onCheckedChange={(v) => onUpdateGroup(group.key, { required: v })}
						aria-label="المجموعة إلزامية"
					/>
				</div>
			</div>
			{/* Options list */}
			<div className="space-y-2">
				<span className="text-xs font-medium text-muted-foreground block">الخيارات</span>
				{group.options.length === 0 && (
					<p className="text-[11px] text-muted-foreground/70">
						لا توجد خيارات — أضف خيارًا واحدًا على الأقل ليظهر للزبائن
					</p>
				)}
				{group.options.map((o, oi) => (
					<ModifierOptionRow
						key={o.key}
						fId={fId}
						groupKey={group.key}
						option={o}
						index={oi}
						onUpdateOption={onUpdateOption}
						onRemoveOption={onRemoveOption}
					/>
				))}
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onAddOption(group.key)}
					className="h-9 gap-1 text-xs"
					aria-label={`إضافة خيار إلى المجموعة رقم ${toArabicNumber(index + 1)}`}
				>
					<Plus className="size-3" aria-hidden="true" /> إضافة خيار
				</Button>
			</div>
		</fieldset>
	);
}
