'use client';

import { useId } from 'react';
import { Button } from '@/components/ui/button';
import {
        Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        const fId = useId();
        return (
                <Dialog open={open} onOpenChange={onOpenChange}>
                        <DialogContent>
                                <DialogHeader>
                                        <DialogTitle>{editing ? 'تعديل تصنيف' : 'إضافة تصنيف'}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                        <div>
                                                <Label htmlFor={`${fId}-name`}>الاسم</Label>
                                                <Input
                                                        id={`${fId}-name`}
                                                        value={form.name}
                                                        onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                                                        placeholder="مشروبات ساخنة"
                                                        className="mt-1.5"
                                                />
                                        </div>
                                        <div>
                                                <Label htmlFor={`${fId}-name-en`}>الاسم بالإنجليزية</Label>
                                                <Input
                                                        id={`${fId}-name-en`}
                                                        value={form.nameAr}
                                                        onChange={(e) => onFormChange({ ...form, nameAr: e.target.value })}
                                                        placeholder="اختياري — بالإنجليزية"
                                                        className="mt-1.5 text-start"
                                                        dir="ltr"
                                                />
                                        </div>
                                        <div>
                                                <Label>أيقونة</Label>
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
                                                                                        'size-10 rounded-lg flex items-center justify-center border transition-[border-color,background-color,transform,translate,scale,rotate] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                                        form.icon === iconName
                                                                                                ? 'border-orange bg-orange-muted scale-110'
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
