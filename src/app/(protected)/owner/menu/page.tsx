'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
        Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
        DialogDescription,
} from '@/components/ui/dialog';
import { SearchInput } from '@/components/ui/search-input';
import { AlertCircle } from 'lucide-react';
import { MotionPlus } from '@/components/ui/motion-icons';
import { BackButton } from '@/components/shared/BackButton';
import { csrfJson } from '@/lib/csrf-client';
import { PlanUsageBadge } from '@/components/owner/PlanUsageBadge';
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';
import { ItemDialog } from '@/components/owner/ItemDialog';
import { premiumToast } from '@/lib/premium-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import { type Category, type Item, CATEGORY_ICONS } from './types';
import { CategoriesList } from './CategoriesList';
import { CategoryDialog } from './CategoryDialog';

export default function OwnerMenuPage() {
        const [restaurantId, setRestaurantId] = useState(0);
        const [categories, setCategories] = useState<Category[]>([]);
        const [loading, setLoading] = useState(true);
        const [expandedCat, setExpandedCat] = useState<number | null>(null);
        const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [catDialog, setCatDialog] = useState(false);
        const [catEditing, setCatEditing] = useState<Category | null>(null);
        const [catForm, setCatForm] = useState({ name: '', nameAr: '', icon: 'Package' });
        const [itemCatId, setItemCatId] = useState(0);
        const [itemEditing, setItemEditing] = useState<Item | null>(null);
        const [itemDialogOpen, setItemDialogOpen] = useState(false);
        const [deleteTarget, setDeleteTarget] = useState<{
                type: 'category' | 'item';
                id: number;
                name: string;
        } | null>(null);
        const [usageKey, setUsageKey] = useState(0);
        const [error, setError] = useState<string | null>(null);
        const fetchCatsRef = useRef<() => Promise<void>>(undefined);

        const fetchCats = useCallback(async () => {
                if (!restaurantId) return;
                try {
                        setLoading(true);
                        setError(null);
                        const r = await fetch(`/api/categories?restaurantId=${restaurantId}`);
                        if (!r.ok) throw Error(`${r.status}`);
                        const j = await r.json();
                        const cats = j.events ?? j.data ?? j;
                        setCategories(Array.isArray(cats) ? cats : []);
                } catch {
                        setError('فشل تحميل التصنيفات');
                        premiumToast('error', 'فشل تحميل التصنيفات');
                        /* ponytail: auto-retry once after 3s */ setTimeout(() => {
                                if (restaurantId && fetchCatsRef.current) fetchCatsRef.current();
                        }, 3000);
                } finally {
                        setLoading(false);
                }
        }, [restaurantId]);
        useEffect(() => {
                fetchCatsRef.current = fetchCats;
        }, [fetchCats]);

        // round86-C4: shared active-restaurant hook (this page previously hand-rolled
        // it WITHOUT the switch event subscription — switching restaurants from the
        // switcher left the editor on the OLD restaurant until reload)
        const { activeId } = useActiveRestaurant();
        useEffect(() => {
                if (activeId) setRestaurantId(activeId);
        }, [activeId]);

        useEffect(() => {
                if (restaurantId) fetchCats();
        }, [restaurantId, fetchCats]);

        const fetchItems = useCallback(async (catId: number) => {
                try {
                        const r = await fetch(`/api/items?categoryId=${catId}`);
                        const j = await r.json();
                        setCategories((p) =>
                                p.map((c) =>
                                        c.id === catId ? { ...c, items: Array.isArray(j.data ?? j) ? (j.data ?? j) : [] } : c
                                )
                        );
                } catch {
                        premiumToast('error', 'فشل تحميل الأصناف');
                }
        }, []);

        const toggleCat = (id: number) => {
                setExpandedCat((p) => (p === id ? null : id));
                if (expandedCat !== id) fetchItems(id);
        };

        const saveCat = async () => {
                if (!catForm.name.trim()) {
                        premiumToast('error', 'يرجى إدخال الاسم');
                        return;
                }
                try {
                        const body = {
                                name: catForm.name.trim(),
                                nameAr: catForm.nameAr.trim() || undefined,
                                icon: catForm.icon.trim(),
                                restaurantId,
                        };
                        if (catEditing)
                                await csrfJson(`/api/categories/${catEditing.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(body),
                                });
                        else
                                await csrfJson('/api/categories', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(body),
                                });
                        premiumToast('save', catEditing ? 'تم التحديث' : 'تمت الإضافة');
                        setCatDialog(false);
                        fetchCats();
                        setUsageKey((k) => k + 1);
                } catch (e) {
                        /* r121-P-5 (M-ErrSurface): csrfJson يرمي رسالة الخادم العربية
                           (مثل 403 «اشتراكك منتهي. جدّد اشتراكك للمتابعة.» وسقف الباقة)
                           — كان المصدر يبتلعها خلف «فشل الحفظ» العامة، على نفس الصفحة
                           التي يعرض فيها use-item-save الرسالة الصريحة. */
                        premiumToast('error', getErrorMessage(e, 'فشل الحفظ'));
                }
        };

        const delTarget = async () => {
                if (!deleteTarget) return;
                try {
                        await csrfJson(
                                `/api/${deleteTarget.type === 'category' ? 'categories' : 'items'}/${deleteTarget.id}`,
                                { method: 'DELETE' }
                        );
                        premiumToast('trash', 'تم الحذف');
                        setDeleteTarget(null);
                        if (deleteTarget.type === 'category') fetchCats();
                        else if (expandedCat) fetchItems(expandedCat);
                        setUsageKey((k) => k + 1);
                } catch {
                        premiumToast('error', 'فشل الحذف');
                }
        };

        const toggleStatus = async (item: Item) => {
                if (pendingToggleId === item.id) return; // in-flight — prevent double-toggle race
                const ns = item.status === 'available' ? 'unavailable' : 'available';
                setPendingToggleId(item.id);
                try {
                        await csrfJson(`/api/items/${item.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: ns }),
                        });
                        premiumToast('save', ns === 'available' ? 'متوفر' : 'غير متوفر');
                        if (expandedCat) fetchItems(expandedCat);
                } catch {
                        premiumToast('error', 'فشل التحديث');
                } finally {
                        setPendingToggleId(null);
                }
        };

        const filteredCategories = categories.filter((cat) => {
                if (!searchTerm) return true;
                const q = searchTerm.toLowerCase();
                return (
                        cat.name.includes(q) ||
                        cat.nameAr?.includes(q) ||
                        cat.items?.some((i) => i.name.includes(q) || i.nameAr?.includes(q))
                );
        });

        // Extracted-section callbacks (round89-G3) — the same state writes the
        // old inline arrows performed, in the same order.
        const handleAddItem = (catId: number) => {
                setItemCatId(catId);
                setItemEditing(null);
                setItemDialogOpen(true);
        };
        const handleEditCategory = (cat: Category) => {
                setCatEditing(cat);
                setCatForm({ name: cat.name, nameAr: cat.nameAr || '', icon: cat.icon });
                setCatDialog(true);
        };
        const handleDeleteCategory = (cat: Category) =>
                setDeleteTarget({ type: 'category', id: cat.id, name: cat.name });
        const handleEditItem = (item: Item) => {
                setItemEditing(item);
                setItemDialogOpen(true);
        };
        const handleDeleteItem = (item: Item) =>
                setDeleteTarget({ type: 'item', id: item.id, name: item.name });
        const handleAddCategory = () => {
                setCatEditing(null);
                setCatForm({ name: '', nameAr: '', icon: 'Package' });
                setCatDialog(true);
        };

        if (loading)
                return (
                        <div className="space-y-4 animate-fade-in">
                                <LoadingAnnouncer loading={true} message="جارٍ تحميل التصنيفات..." />
                                {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-16 rounded-md bg-muted/50 animate-breath" />
                                ))}
                        </div>
                );

        if (error)
                return (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
                                <div className="size-16 rounded-md bg-destructive/10 flex items-center justify-center">
                                        <AlertCircle className="size-8 text-destructive/60" />
                                </div>
                                <p className="text-lg font-medium">{error}</p>
                                <Button variant="outline" size="sm" onClick={() => fetchCats()} className="gap-1.5">
                                        إعادة المحاولة
                                </Button>
                        </div>
                );

        return (
                <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                        <BackButton href="/owner" />
                                        <h1 className="text-2xl font-bold tracking-normal">إدارة المنيو</h1>
                                        <p className="text-sm text-muted-foreground">أضف وعدل الأصناف والفئات في قائمة مطعمك</p>
                                </div>
                                <Button
                                        variant="orange"
                                        onClick={() => {
                                                setCatEditing(null);
                                                setCatForm({
                                                        name: '',
                                                        nameAr: '',
                                                        icon: CATEGORY_ICONS[Math.floor(Math.random() * CATEGORY_ICONS.length)],
                                                });
                                                setCatDialog(true);
                                        }}
                                        className="gap-2"
                                >
                                        <MotionPlus className="size-4" /> تصنيف جديد
                                </Button>
                        </div>

                        <div className="relative">
                                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="ابحث في القائمة..." />
                        </div>

                        {restaurantId > 0 && <PlanUsageBadge key={usageKey} restaurantId={restaurantId} />}

                        <CategoriesList
                                categories={filteredCategories}
                                searchTerm={searchTerm}
                                expandedCatId={expandedCat}
                                pendingToggleId={pendingToggleId}
                                onToggleCategory={toggleCat}
                                onAddItem={handleAddItem}
                                onEditCategory={handleEditCategory}
                                onDeleteCategory={handleDeleteCategory}
                                onToggleItemStatus={toggleStatus}
                                onEditItem={handleEditItem}
                                onDeleteItem={handleDeleteItem}
                                onAddCategory={handleAddCategory}
                        />

                        <CategoryDialog
                                open={catDialog}
                                onOpenChange={setCatDialog}
                                editing={Boolean(catEditing)}
                                form={catForm}
                                onFormChange={setCatForm}
                                onSave={saveCat}
                        />

                        {/* Item Dialog */}
                        <ItemDialog
                                open={itemDialogOpen}
                                onOpenChange={setItemDialogOpen}
                                editing={itemEditing}
                                categoryId={itemCatId}
                                onSaved={() => {
                                        if (expandedCat) fetchItems(expandedCat);
                                        setUsageKey((k) => k + 1);
                                }}
                        />

                        {/* Delete Confirmation */}
                        <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                                <DialogContent>
                                        <DialogHeader>
                                                <DialogTitle>تأكيد الحذف</DialogTitle>
                                                <DialogDescription>
                                                        هل أنت متأكد من حذف &ldquo;{deleteTarget?.name}&rdquo;؟ هذا الإجراء لا يمكن التراجع
                                                        عنه.
                                                </DialogDescription>
                                        </DialogHeader>
                                        <div className="flex justify-end gap-2">
                                                <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                                                        إلغاء
                                                </Button>
                                                <Button variant="destructive" onClick={delTarget}>
                                                        حذف
                                                </Button>
                                        </div>
                                </DialogContent>
                        </Dialog>
                </div>
        );
}
