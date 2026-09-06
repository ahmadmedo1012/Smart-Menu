'use client';

import { Button } from '@/components/ui/button';
import {
        Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CATEGORY_ICONS, CATEGORY_ICON_MAP } from './types';

export interface CategoryForm {
        name: string;
        nameAr: string;
        icon: string;
}

interface CategoryDialogProps {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        editing: boolean;
        form: CategoryForm;
        onFormChange: (form: CategoryForm) => void;
        onSave: () => void;
}

/** Category add/edit dialog — verbatim extraction from the owner menu page
 * (round89-G3); the form state itself stays owned by the page. */
export function CategoryDialog({
        open,
        onOpenChange,
        editing,
        form,
        onFormChange,
        onSave,
}: CategoryDialogProps) {
        // Category Dialog
        return (
                <Dialog open={open} onOpenChange={onOpenChange}>
                        <DialogContent className="rounded-md">
                                <DialogHeader>
                                        <DialogTitle>{editing ? 'تعديل تصنيف' : 'إضافة تصنيف'}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                        <div>
                                                <label className="text-sm font-medium">الاسم</label>
                                                <input
                                                        value={form.name}
                                                        onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                                                        placeholder="مشروبات ساخنة"
                                                        className="w-full h-11 rounded-[4px] border border-border/30 px-4 text-sm outline-none mt-1.5 focus-visible:border-orange"
                                                />
                                        </div>
                                        <div>
                                                <label className="text-sm font-medium">الاسم بالإنجليزية</label>
                                                <input
                                                        value={form.nameAr}
                                                        onChange={(e) => onFormChange({ ...form, nameAr: e.target.value })}
                                                        placeholder="اختياري — بالإنجليزية"
                                                        className="w-full h-11 rounded-[4px] border border-border/30 px-4 text-sm outline-none mt-1.5 text-start"
                                                        dir="ltr"
                                                />
                                        </div>
                                        <div>
                                                <label className="text-sm font-medium">أيقونة</label>
                                                <div className="flex flex-wrap gap-2 mt-1.5">
                                                        {CATEGORY_ICONS.map((iconName) => {
                                                                const IconComp =
                                                                        iconName in CATEGORY_ICON_MAP ? CATEGORY_ICON_MAP[iconName] : null;
                                                                if (!IconComp) return null;
                                                                return (
                                                                        <button
                                                                                key={iconName}
                                                                                type="button"
                                                                                onClick={() => onFormChange({ ...form, icon: iconName })}
                                                                                className={cn(
                                                                                        'size-10 rounded-[4px] flex items-center justify-center border transition-[border-color,background-color,transform,translate,scale,rotate] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                                        form.icon === iconName
                                                                                                ? 'border-orange bg-orange-muted dark:bg-orange-muted scale-110'
                                                                                                : 'border-border/30 hover:border-orange/30'
                                                                                )}
                                                                        >
                                                                                <IconComp className="size-5" />
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
                                        <Button variant="orange" onClick={onSave}>
                                                {editing ? 'تحديث' : 'إضافة'}
                                        </Button>
                                </div>
                        </DialogContent>
                </Dialog>
        );
}
