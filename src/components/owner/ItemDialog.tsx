'use client';
/*
 * ItemDialog.tsx — round94 W2-b (inspection-c §2.3/§2.5): the THIN ORCHESTRATOR.
 * Everything else moved to src/components/owner/item-dialog/ (13 files):
 * 4 hooks (form/modifier-groups/image-upload/save), 2 pure units
 * (types/modifier-draft-utils) and 7 view sections. Behavior preserved
 * verbatim; the ONLY sanctioned changes (inspection-c §2.2):
 *   1. patch() is a functional setForm — closes the stale-closure race of
 *      the async image upload (old line 569 clobbered fields typed during
 *      the upload).
 *   2. Four broken literal span ids (old 594/854/909/941) are now real
 *      template literals (they used to print the raw text `${fId}-…`).
 */

import { useEffect, useId } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useItemForm } from './item-dialog/use-item-form';
import { useModifierGroups } from './item-dialog/use-modifier-groups';
import { useImageUpload } from './item-dialog/use-image-upload';
import { useItemSave } from './item-dialog/use-item-save';
import { ItemCoreFields } from './item-dialog/ItemCoreFields';
import { ItemImageField } from './item-dialog/ItemImageField';
import { ModifierGroupsEditor } from './item-dialog/ModifierGroupsEditor';
import { FeaturedShowcaseSection } from './item-dialog/FeaturedShowcaseSection';
import { DietaryAllergensSection } from './item-dialog/DietaryAllergensSection';
import type { Item } from './item-dialog/types';

/* Re-exports keep the two external import sites untouched
 * (owner/menu/page.tsx imports ItemDialog; owner/menu/types.ts imports
 * ItemModifierGroup). ItemModifierOption/ModifierGroupPayload stay exported
 * as the documented POST/PUT contract (knip advisory, unchanged). */
export type {
	Item,
	ItemModifierOption,
	ItemModifierGroup,
	ModifierGroupPayload,
} from './item-dialog/types';

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
	// — ONE useId for the whole dialog so multiple dialog instances can
	// never collide (same as before the split).
	const fId = useId();
	const {
		form,
		patch,
		badgeDraft,
		setBadgeDraft,
		addBadge,
		removeBadge,
		toggleDietaryTag,
		toggleAllergen,
		reset: resetForm,
	} = useItemForm();
	const {
		groups,
		addGroup,
		updateGroup,
		removeGroup,
		addOption,
		updateOption,
		removeOption,
		reset: resetGroups,
		buildPayload,
	} = useModifierGroups();
	const { uploading, uploadFile } = useImageUpload((url) => patch({ image: url }));
	const { saving, save } = useItemSave({
		editing,
		form,
		groups,
		buildPayload,
		onOpenChange,
		onSaved,
	});

	// Reset form when dialog opens (source effect 332–358): same condition and
	// same deps [open, editing, categoryId] as before the split. The reset
	// fns are deliberately NOT in the deps: they are recreated every render
	// (the plan forbids useCallback in this wave) and only read stable state
	// setters, so listing them would re-run this effect after every render —
	// and each run sets fresh objects, i.e. an endless re-render loop.
	useEffect(() => {
		if (open) {
			setBadgeDraft(''); // stays FIRST (call-order parity with the old effect)
			resetGroups(editing?.modifierGroups);
			resetForm(editing, categoryId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, editing, categoryId]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg rounded-md">
				<DialogHeader>
					<DialogTitle>{editing ? 'تعديل صنف' : 'إضافة صنف'}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 max-h-[60vh] overflow-y-auto">
					<ItemCoreFields fId={fId} form={form} patch={patch} />
					<ItemImageField
						fId={fId}
						image={form.image}
						uploading={uploading}
						onImageChange={(v) => patch({ image: v })}
						onUploadFile={uploadFile}
					/>
					<ModifierGroupsEditor
						fId={fId}
						groups={groups}
						onAddGroup={addGroup}
						onRemoveGroup={removeGroup}
						onUpdateGroup={updateGroup}
						onAddOption={addOption}
						onUpdateOption={updateOption}
						onRemoveOption={removeOption}
					/>
					<FeaturedShowcaseSection
						fId={fId}
						isFeatured={form.isFeatured}
						onToggleFeatured={(v) => patch({ isFeatured: v })}
						featuredRank={form.featuredRank}
						onRankChange={(v) => patch({ featuredRank: v })}
						showcaseTags={form.showcaseTags}
						badgeDraft={badgeDraft}
						onBadgeDraftChange={setBadgeDraft}
						onAddBadge={addBadge}
						onRemoveBadge={removeBadge}
					/>
					<DietaryAllergensSection
						fId={fId}
						dietaryTags={form.dietaryTags}
						allergens={form.allergens}
						onToggleDietary={toggleDietaryTag}
						onToggleAllergen={toggleAllergen}
					/>
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
