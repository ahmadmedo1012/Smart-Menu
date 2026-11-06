'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { MotionPlus } from '@/components/ui/motion-icons';
import { BackButton } from '@/components/shared/BackButton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { csrfJson } from '@/lib/csrf-client';
import { PlanUsageBadge } from '@/components/owner/PlanUsageBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { MenuManagerSkeleton } from '@/components/shared/DashboardSkeletons';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';
import { ItemDialog } from '@/components/owner/ItemDialog';
import { premiumToast } from '@/lib/premium-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import { toArabicNumber } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';
import { computeMoveWrites, moveItemInList } from '@/lib/menu-reorder';
import { type Category, type Item, CATEGORY_ICONS } from './types';
import { copyItemsSequentially, itemDuplicatePayload, withCopySuffix } from './duplicate-utils';
import { CategoriesList } from './CategoriesList';
import { CategoryDialog } from './CategoryDialog';
import { ArchivedItems } from './ArchivedItems';
import { BulkActionBar } from './BulkActionBar';

/* W6-B6 (G-2): ثوابت تحميل الأصناف — انظر التعليق أعلى fetchItems. */
const ITEMS_PAGE_SIZE = 100; // سقف parsePagination لمسار items
const ITEMS_LOAD_CAP = 500; // 5 طلبات متتالية — حد الترتيب الصادق
/* P45-W1 (البند 3 — ترتيب الفئات): نفس عائلة ثوابت الأصناف للمسار */
const CATS_PAGE_SIZE = 100; // سقف parsePagination الأقصى لمسار categories
const CATS_LOAD_CAP = 500; // سقف صادق فوق كل منيو واقعي (سقف الأقسام 1000)

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
        /* P42-W3 (الأرشفة الحقيقية): هدف حوار تأكيد الأرشفة — نمط ConfirmDialog
         * نفسه لكن غير تدميري (الاسترجاع متاح دائمًا من لوحة «المؤرشفة»). */
        const [archiveTarget, setArchiveTarget] = useState<Item | null>(null);
        const [usageKey, setUsageKey] = useState(0);
        const [error, setError] = useState<string | null>(null);
        /* W6-B6 (G-2 — تدقيق W6-A3): حالة الترتيب والتحديد الجماعي. */
        const [movingCatId, setMovingCatId] = useState<number | null>(null);
        const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
        /* P43 SM-1c: العملية الجماعية صارت طلبًا واحدًا (‎/api/items/bulk‎) —
         * مؤشر شغل واحد بدل عدّاد تقدم الصف-بصف (W6-B6 القديم). */
        const [bulkBusy, setBulkBusy] = useState(false);
        /* P43 SM-1c: هدف حوار تأكيد الأرشفة الجماعية (نفس النمط غير التدميري
         * للمفرد — الاسترجاع من لوحة «الأصناف المؤرشفة»). */
        const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
        /* P45-W1 (البند 3): ترتيب الفئات — حالة شغل النقل + قصّ التحميل
         * (عقد menu-reorder: التطبيع على قائمة مقصوصة كاذب — نفس حكم
         * W6-B6 على الأصناف). */
        const [catsMoving, setCatsMoving] = useState(false);
        const [catsTruncated, setCatsTruncated] = useState(false);
        /* P45-W1 (البند 3): هدف حوار تأكيد تكرار فئة + صنف قيد التكرار. */
        const [duplicateCatTarget, setDuplicateCatTarget] = useState<Category | null>(null);
        const [duplicatingCat, setDuplicatingCat] = useState(false);
        const [duplicatingItemId, setDuplicatingItemId] = useState<number | null>(null);
        const fetchCatsRef = useRef<() => Promise<void>>(undefined);
        /* r133 (A3 S2): bounded auto-retry — the old unbounded 3s loop re-fired
           the error toast and flipped skeleton↔ErrorState forever during an
           outage. Max 3 attempts with linear backoff (3s/6s/9s), then a
           dead-end ErrorState whose retry button is the manual path. */
        const RETRY_MAX = 3;
        const retryCountRef = useRef(0);

        /* P45-W1 (البند 3): تحميل الفئات بكل صفحاتها حتى سقف صادق — نفس عقد
         * fetchItems للأصناف: أزرار النقل تعطّل بصراحة على القائمة المقصوصة
         * (سقف 500 فوق كل منيو واقعي — سقف الأقسام التنظيمي 1000). */
        const fetchCats = useCallback(async () => {
                if (!restaurantId) return;
                try {
                        setLoading(true);
                        setError(null);
                        const all: Category[] = [];
                        let total = Number.POSITIVE_INFINITY;
                        for (let page = 1; all.length < CATS_LOAD_CAP; page++) {
                                const r = await fetch(
                                        `/api/categories?restaurantId=${restaurantId}&page=${page}&pageSize=${CATS_PAGE_SIZE}`
                                );
                                if (!r.ok) throw Error(`${r.status}`);
                                const j = await r.json();
                                const rows: Category[] = Array.isArray(j.events ?? j.data ?? j)
                                        ? ((j.events ?? j.data ?? j) as Category[])
                                        : [];
                                total = j?.meta?.total ?? rows.length;
                                all.push(...rows);
                                if (rows.length < CATS_PAGE_SIZE || all.length >= total) break;
                        }
                        setCategories(all);
                        setCatsTruncated(all.length < total);
                        retryCountRef.current = 0; // success ends the cycle
                } catch {
                        setError('تعذّر تحميل التصنيفات');
                        const attempt = retryCountRef.current + 1;
                        retryCountRef.current = attempt;
                        if (attempt <= RETRY_MAX) {
                                setTimeout(() => {
                                        if (restaurantId && fetchCatsRef.current) fetchCatsRef.current();
                                }, 3000 * attempt);
                        } else {
                                // terminal: one toast for the whole cycle (was one per 3s)
                                premiumToast('error', 'تعذّر تحميل التصنيفات');
                        }
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
                if (restaurantId) {
                        retryCountRef.current = 0; // fresh cycle per restaurant
                        fetchCats();
                }
        }, [restaurantId, fetchCats]);

        /* W6-B6 (G-2): تحميل كل أصناف القسم — القائمة الكاملة شرط عقد الترتيب
           (التطبيع على قائمة مقصوصة كان سيفسد ترتيب الصفوف غير المحمّلة). الحد
           100/صفحة هو سقف parsePagination للمسار؛ سقف 500 صادق (5 طلبات) يغطي
           كل خطة واقعية (أساسية 50 · بريميوم 100) — القسم الأضخم منه يُعلَّم
           itemsTruncated وتُعطّل أزرار النقل بصراحة بدل ترتيب كاذب. الأثر
           الجانبي الصادق: المحرر كان يعرض أول 50 فقط بلا ترقيم — الآن يعرض
           الكل حتى السقف.
           P45-W1 (البند 3): تعيد القائمة المحمّلة — مسار تكرار الصنف يحتاج
           الصف الجديد كاملًا (مع مجموعات إضافاته) لفتح المحرر عليه. */
        const fetchItems = useCallback(async (catId: number): Promise<Item[]> => {
                try {
                        const all: Item[] = [];
                        let total = Number.POSITIVE_INFINITY;
                        for (let page = 1; all.length < ITEMS_LOAD_CAP; page++) {
                                const r = await fetch(
                                        `/api/items?categoryId=${catId}&page=${page}&pageSize=${ITEMS_PAGE_SIZE}`
                                );
                                if (!r.ok) throw Error(`${r.status}`);
                                const j = await r.json();
                                const rows: Item[] = Array.isArray(j.data ?? j) ? (j.data ?? j) : [];
                                total = j?.meta?.total ?? rows.length;
                                all.push(...rows);
                                if (rows.length < ITEMS_PAGE_SIZE || all.length >= total) break;
                        }
                        const truncated = all.length < total;
                        setCategories((p) =>
                                p.map((c) => (c.id === catId ? { ...c, items: all, itemsTruncated: truncated } : c))
                        );
                        return all;
                } catch {
                        premiumToast('error', 'تعذّر تحميل الأصناف');
                        return [];
                }
        }, []);

        const toggleCat = (id: number) => {
                setExpandedCat((p) => (p === id ? null : id));
                if (expandedCat !== id) {
                        // التحديد مقيد بالقسم المفتوح — تبديل القسم يبدأ صفحة نظيفة
                        setSelectedItemIds(new Set());
                        fetchItems(id);
                }
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
                           — كان المصدر يبتلعها خلف «تعذّر الحفظ» العامة، على نفس الصفحة
                           التي يعرض فيها use-item-save الرسالة الصريحة. */
                        premiumToast('error', getErrorMessage(e, 'تعذّر الحفظ'));
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
                } catch (e) {
                        /* P42-2 (F-1/F-3): the server's honest 409 copy (review-vs-order
                           blocker + remedy) must reach the owner — the bare «تعذّر الحذف»
                           hid even the category message. Same pattern as the save path
                           above. */
                        premiumToast('error', getErrorMessage(e, 'تعذّر الحذف'));
                } finally {
                        // W6-B6: صنف محذوف لا يبقى في التحديد الجماعي
                        setSelectedItemIds((prev) => {
                                if (!prev.has(deleteTarget.id)) return prev;
                                const next = new Set(prev);
                                next.delete(deleteTarget.id);
                                return next;
                        });
                }
        };

        /* ── P42-W3 (الأرشفة الحقيقية): أرشفة صنف — غير تدميري ────────────────
           PUT ‎{archivedAt: now}‎ واحد: الصنف يغادر كل واجهة عامة (القائمة،
           الجوال، الطلب، سقف الباقة) ويبقى صفه وسجله (طلبات/تقييمات) سليمًا.
           الاسترجاع لاحقًا من لوحة «الأصناف المؤرشفة» أدناه (PUT null). */
        const archiveItem = async () => {
                if (!archiveTarget) return;
                const target = archiveTarget;
                setArchiveTarget(null);
                try {
                        await csrfJson(`/api/items/${target.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ archivedAt: new Date().toISOString() }),
                        });
                        premiumToast(
                                'save',
                                `تمت أرشفة «${target.nameAr || target.name}» — اختفى من القائمة العامة وبقي سجله سليمًا`,
                        );
                        if (expandedCat) fetchItems(expandedCat);
                        setUsageKey((k) => k + 1); // المؤرشف غادر سقف الباقة — العداد يتحدث
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّرت الأرشفة'));
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
                } catch (e) {
                        /* P42-2 (F-2): the expired-subscription 403 (and any other
                           server copy) surfaces as-is — the bare «تعذّر التحديث» made
                           owners retry forever on a plan gate. */
                        premiumToast('error', getErrorMessage(e, 'تعذّر التحديث'));
                } finally {
                        setPendingToggleId(null);
                }
        };

        /* ── W6-B6 (G-2): نقل صنف خانة واحدة (فوق/تحت) ────────────────────────
           متفائل: القائمة تتحرك فورًا، ثم تُكتب الفروق فقط (PUTs فردية —
           عقد menu-reorder). أي فشل يعيد المزامنة من الخادم (مصدر الحقيقة)
           ويعرض رسالته العربية كما هي — لا تراجع يدوي قد يفشل بدوره. */
        const moveItem = async (item: Item, dir: 'up' | 'down') => {
                if (movingCatId || bulkBusy) return;
                const cat = categories.find((c) => c.items?.some((i) => i.id === item.id));
                if (!cat || !cat.items) return;
                const nextItems = moveItemInList(cat.items, item.id, dir);
                if (!nextItems) return; // الأول فوق / الأخير تحت
                const writes = computeMoveWrites(cat.items, item.id, dir);
                if (writes.length === 0) return;
                setMovingCatId(cat.id);
                setCategories((p) => p.map((c) => (c.id === cat.id ? { ...c, items: nextItems } : c)));
                try {
                        for (const w of writes) {
                                await csrfJson(`/api/items/${w.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ sortOrder: w.sortOrder }),
                                });
                        }
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر تحديث الترتيب'));
                        if (expandedCat) fetchItems(expandedCat);
                } finally {
                        setMovingCatId(null);
                }
        };

        /* ── P45-W1 (البند 3): نقل فئة خانة واحدة (فوق/تحت) ──────────────────
           نفس عقد W6-B6 للأصناف حرفيًا لكن على قائمة الفئات الكاملة:
           محرّك menu-reorder نفسه (لا تفرّع — Category يحقّق واجهة
           OrderableItem بـ id+sortOrder)، والكتابة عبر عقد PUT sortOrder
           القائم للمسار (/api/categories/[id] — يطهّر ISR داخلية) بفروق
           الفتحات فقط. متفائل: القائمة تتحرك فورًا؛ أي فشل يعيد المزامنة
           من الخادم ويعرض رسالته العربية كما هي. */
        const moveCategory = async (cat: Category, dir: 'up' | 'down') => {
                if (catsMoving || movingCatId || bulkBusy) return;
                const nextCats = moveItemInList(categories, cat.id, dir);
                if (!nextCats) return; // الأولى فوق / الأخيرة تحت
                const writes = computeMoveWrites(categories, cat.id, dir);
                if (writes.length === 0) return;
                setCatsMoving(true);
                setCategories(nextCats);
                try {
                        for (const w of writes) {
                                await csrfJson(`/api/categories/${w.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ sortOrder: w.sortOrder }),
                                });
                        }
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر تحديث ترتيب التصنيفات'));
                        fetchCats();
                } finally {
                        setCatsMoving(false);
                }
        };

        /* ── P45-W1 (البند 3): تكرار صنف ──────────────────────────────────────
           POST واحد عبر مسار الإنشاء القائم (سقف maxItems يُفحص داخل
           معاملته FOR UPDATE)، بلاحقة « (نسخة)» على الاسمين، ثم يُفتح
           المحرر على النسخة الجديدة بصفّها الكامل (تحديث القسم يحملها
           مع مجموعات إضافاتها — صدى POST لا يشملها، وفتح المحرر على صف
           ناقص كان سيمسحها عند الحفظ باستراتيجية الاستبدال). */
        const duplicateItem = async (item: Item) => {
                if (duplicatingItemId || duplicatingCat || catsMoving || movingCatId || bulkBusy) return;
                setDuplicatingItemId(item.id);
                try {
                        const res = await csrfJson<{ data: { id: number } }>('/api/items', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(itemDuplicatePayload(item, item.categoryId)),
                        });
                        const newId = res?.data?.id;
                        premiumToast('save', 'تم تكرار الصنف — عدّل النسخة ثم احفظ');
                        setUsageKey((k) => k + 1);
                        const fresh = await fetchItems(item.categoryId);
                        const copy = fresh.find((i) => i.id === newId);
                        if (copy) {
                                setItemCatId(copy.categoryId);
                                setItemEditing(copy);
                                setItemDialogOpen(true);
                        }
                } catch (e) {
                        /* سقف الباقة (403 برسالة الخطة العربية) وغيره يظهر كما
                           هو — فحص المعاملة هو مصدر الحقيقة الوحيد. */
                        premiumToast('error', getErrorMessage(e, 'تعذّر تكرار الصنف'));
                        if (expandedCat) fetchItems(expandedCat);
                } finally {
                        setDuplicatingItemId(null);
                }
        };

        /* ── P45-W1 (البند 3): تكرار فئة ──────────────────────────────────────
           بعد التأكيد الصريح (حوار بعدد صادق): إنشاء القسم الجديدة (لاحقة
           النسخة + إلحاق بذيل الترتيب)، ثم نسخ الأصناف تسلسليًا عبر مسار
           الإنشاء القائم — كل POST يعيد فحص السقف داخل معاملته وعند الرفض
           تتوقف الحلقة برسالة الخادم + عدد ما نُسخ فعلًا (الخيار الصادق
           الموثق في duplicate-utils: لا فحصًا مسبقًا من الواجهة — القسم
           الجديدة تبقى بما اتسع له، والمالك يرى الحقيقة ويقرر). */
        const duplicateCategory = async () => {
                const target = duplicateCatTarget;
                if (!target || duplicatingCat) return;
                setDuplicatingCat(true);
                try {
                        // آخر ترتيب محمّل + 1 — إلحاق صادق بذيل القائمة (تعادل
                        // القيم يسقط لترتيب الإدخال فالجديدة تلي نظيراتها)
                        const appendSort = Math.max(-1, ...categories.map((c) => c.sortOrder)) + 1;
                        const created = await csrfJson<{ data: { id: number } }>('/api/categories', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                        name: withCopySuffix(target.name),
                                        nameAr: target.nameAr ? withCopySuffix(target.nameAr) : undefined,
                                        icon: target.icon,
                                        restaurantId,
                                        sortOrder: appendSort,
                                }),
                        });
                        const newCatId = created?.data?.id;
                        // جلب أصناف الأصل كاملة (نفس سقف التحميل الصادق)
                        const source: Item[] = [];
                        let total = Number.POSITIVE_INFINITY;
                        for (let page = 1; source.length < ITEMS_LOAD_CAP; page++) {
                                const r = await fetch(
                                        `/api/items?categoryId=${target.id}&page=${page}&pageSize=${ITEMS_PAGE_SIZE}`
                                );
                                if (!r.ok) throw Error(`${r.status}`);
                                const j = await r.json();
                                const rows: Item[] = Array.isArray(j.data ?? j) ? (j.data ?? j) : [];
                                total = j?.meta?.total ?? rows.length;
                                source.push(...rows);
                                if (rows.length < ITEMS_PAGE_SIZE || source.length >= total) break;
                        }
                        const result = await copyItemsSequentially(source, newCatId, (payload) =>
                                csrfJson('/api/items', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(payload),
                                })
                        );
                        setDuplicateCatTarget(null);
                        if (result.stoppedBy) {
                                premiumToast(
                                        'error',
                                        `توقف النسخ بعد ${toArabicNumber(result.copied)} من ${toArabicNumber(result.total)} ${getArabicPlural(result.total, 'صنف', 'صنفان', 'أصناف')} — ${result.stoppedBy}`
                                );
                        } else {
                                premiumToast(
                                        'save',
                                        `تم تكرار القسم مع ${toArabicNumber(result.copied)} ${getArabicPlural(result.copied, 'صنف', 'صنفان', 'أصناف')}`
                                );
                        }
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر تكرار القسم'));
                } finally {
                        setDuplicatingCat(false);
                        fetchCats();
                        setUsageKey((k) => k + 1);
                }
        };

        /* ── P43 SM-1c: العمليات الجماعية — طلب واحد لكل عملية (‎POST
           /api/items/bulk‎): إخفاء/إظهار، أرشفة، ونقل إلى تصنيف. الخادم
           يتحقق من ملكية كل صنف + حارس مستأجر الوجهة (r121-E1) ويسجّل
           AuditLog واحدًا ويطهّر ISR — عقد W6-B6 (التحديد مقيد بالقسم
           المفتوح) يبقى كما هو في الواجهة. */
        const callBulk = async (body: Record<string, unknown>): Promise<boolean> => {
                if (bulkBusy || movingCatId) return false;
                setBulkBusy(true);
                try {
                        await csrfJson('/api/items/bulk', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(body),
                        });
                        return true;
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر تنفيذ العملية'));
                        return false;
                } finally {
                        setBulkBusy(false);
                }
        };

        const applyBulkStatus = async (status: 'available' | 'unavailable') => {
                const ids = [...selectedItemIds];
                if (ids.length === 0) return;
                const ok = await callBulk({ action: 'set-status', status, ids });
                if (ok) {
                        premiumToast(
                                'save',
                                status === 'unavailable'
                                        ? `تم إخفاء ${toArabicNumber(ids.length)} ${getArabicPlural(ids.length, 'صنف', 'صنفان', 'أصناف')}`
                                        : `تم إظهار ${toArabicNumber(ids.length)} ${getArabicPlural(ids.length, 'صنف', 'صنفان', 'أصناف')}`
                        );
                        setSelectedItemIds(new Set());
                        if (expandedCat) fetchItems(expandedCat);
                }
        };

        /* أرشفة المحدد — غير تدميرية (الاسترجاع متاح دائمًا)؛ تأكيد صريح
           لأنها تُخفي دفعة كاملة من القائمة العامة بضغطة. */
        const applyBulkArchive = async () => {
                const ids = [...selectedItemIds];
                if (ids.length === 0) return;
                const ok = await callBulk({ action: 'archive', ids });
                if (ok) {
                        premiumToast(
                                'save',
                                `تمت أرشفة ${toArabicNumber(ids.length)} ${getArabicPlural(ids.length, 'صنف', 'صنفان', 'أصناف')} — اختفت من القائمة العامة وبقي سجلها سليمًا`
                        );
                        setSelectedItemIds(new Set());
                        if (expandedCat) fetchItems(expandedCat);
                        setUsageKey((k) => k + 1); // المؤرشف غادر سقف الباقة
                }
        };

        /* نقل المحدد إلى تصنيف (داخل المطعم نفسه — الخادم يرفض غير ذلك). */
        const applyBulkMove = async (categoryId: number) => {
                const ids = [...selectedItemIds];
                if (ids.length === 0) return;
                const ok = await callBulk({ action: 'move', ids, categoryId });
                if (ok) {
                        premiumToast(
                                'save',
                                `تم نقل ${toArabicNumber(ids.length)} ${getArabicPlural(ids.length, 'صنف', 'صنفان', 'أصناف')} إلى نهاية التصنيف الهدف`
                        );
                        setSelectedItemIds(new Set());
                        fetchCats();
                        if (expandedCat) fetchItems(expandedCat);
                }
        };

        /* SM-UX: إتاحة/إخفاء كل أصناف القسم بضغطة — نفس المسار الجماعي
           (سقف الدفعة 100 يغطي كل قسم واقعي؛ الأكبر يُرفض بصراحة). */
        const setAllCategoryStatus = async (catId: number, status: 'available' | 'unavailable') => {
                const cat = categories.find((c) => c.id === catId);
                const ids = cat?.items?.map((i) => i.id) ?? [];
                if (ids.length === 0) return;
                const ok = await callBulk({ action: 'set-status', status, ids });
                if (ok) {
                        premiumToast('save', status === 'available' ? 'تمت إتاحة كل أصناف القسم' : 'تم إخفاء كل أصناف القسم');
                        fetchItems(catId);
                }
        };

        const toggleSelectItem = (id: number) => {
                setSelectedItemIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                });
        };

        const selectItemsWhere = (catId: number, predicate: (i: Item) => boolean) => {
                const cat = categories.find((c) => c.id === catId);
                const ids = cat?.items?.filter(predicate).map((i) => i.id) ?? [];
                setSelectedItemIds(new Set(ids));
        };

        // تبديل المطعم يبدأ تحديدًا نظيفًا (التحديد مقيد بالقسم المفتوح)
        useEffect(() => {
                setSelectedItemIds(new Set());
        }, [restaurantId]);

        const filteredCategories = categories.filter((cat) => {
                if (!searchTerm) return true;
                const q = searchTerm.toLowerCase();
                // r150 §8: الطرفان مطبّعان — كان الطلب lowercase والمقارنة على
                // الاسم الخام فصارت الأسماء اللاتينية حسّاسة لحالة الأحرف.
                // العربية (nameAr) بلا حالة أحرف أصلًا — تُقارن كما هي.
                return (
                        cat.name.toLowerCase().includes(q) ||
                        cat.nameAr?.includes(q) ||
                        cat.items?.some((i) => i.name.toLowerCase().includes(q) || i.nameAr?.includes(q))
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
                // r131-F5 (A11 SM-2): menu-manager-shaped skeleton — was bare
                // animate-breath rows.
                return <MenuManagerSkeleton />;

        if (error)
                // r131-F5 (A1 P1-12): canonical error family (56px well + dot + retry).
                // r133 (A3 S2): the manual retry button resets the bounded cycle.
                return (
                        <ErrorState
                                title={error}
                                description="تعذّر تحميل التصنيفات — تحقق من الاتصال ثم أعد المحاولة."
                                onRetry={() => {
                                        retryCountRef.current = 0;
                                        fetchCats();
                                }}
                        />
                );

        return (
                /* r131-F5 (A1 P1-7): 40px section rhythm. */
                <div className="space-y-8 animate-fade-in">
                        <BackButton href="/owner" />
                        <PageHeader
                                title="إدارة المنيو"
                                subtitle="أضف وعدل الأصناف والفئات في قائمة مطعمك"
                                actions={
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
                                }
                        />

                        <div className="relative">
                                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="ابحث في القائمة…" />
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
                                onArchiveItem={(item) => setArchiveTarget(item)}
                                onAddCategory={handleAddCategory}
                                selectedItemIds={selectedItemIds}
                                bulkBusy={bulkBusy}
                                movingCatId={movingCatId}
                                onToggleSelectItem={toggleSelectItem}
                                onSelectAvailable={(catId) =>
                                        selectItemsWhere(catId, (i) => i.status === 'available')
                                }
                                onSelectAll={(catId) => selectItemsWhere(catId, () => true)}
                                onClearSelection={() => setSelectedItemIds(new Set())}
                                onSetAllStatus={setAllCategoryStatus}
                                onMoveItem={moveItem}
                                /* P45-W1 (البند 3): النقل والتكرار للفئات + تكرار الصنف */
                                onMoveCategory={moveCategory}
                                onDuplicateCategory={(cat) => setDuplicateCatTarget(cat)}
                                onDuplicateItem={duplicateItem}
                                catsMoving={catsMoving}
                                catsTruncated={catsTruncated}
                                duplicatingCat={duplicatingCat}
                                duplicatingItemId={duplicatingItemId}
                        />

                        {/* P43 SM-1c: شريط الإجراءات الجماعية اللاصق — يظهر عند
                            وجود تحديد؛ النقل مقيد بتصنيفات المطعم نفسه دون
                            القسم المفتوح (الخادم يفرض نفس العقد). */}
                        {selectedItemIds.size > 0 && (
                                <BulkActionBar
                                        selectedCount={selectedItemIds.size}
                                        busy={bulkBusy || movingCatId !== null}
                                        moveTargets={categories.filter((c) => c.id !== expandedCat)}
                                        onSetStatus={applyBulkStatus}
                                        onArchive={() => setBulkArchiveOpen(true)}
                                        onMove={applyBulkMove}
                                        onClear={() => setSelectedItemIds(new Set())}
                                />
                        )}

                        {/* P42-W3 (الأرشفة الحقيقية): لوحة الأصناف المؤرشفة —
                            مكان الاسترجاع والاطلاع، خارج تصنيفات القائمة الحية */}
                        {restaurantId > 0 && (
                                <ArchivedItems
                                        restaurantId={restaurantId}
                                        onUsageChanged={() => setUsageKey((k) => k + 1)}
                                        onItemRestored={() => {
                                                if (expandedCat) fetchItems(expandedCat);
                                                else fetchCats();
                                        }}
                                />
                        )}

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
                                /* P43 SM-1b: المطعم النشط يغذي قائمة قوالب
                                   الإضافات داخل حوار الصنف. */
                                restaurantId={restaurantId}
                                onSaved={() => {
                                        if (expandedCat) fetchItems(expandedCat);
                                        setUsageKey((k) => k + 1);
                                }}
                        />

                        {/* r133 (A3 S3): hand-rolled delete Dialog → the shared ConfirmDialog
                            (the same grammar as owner/restaurants + OrdersTable + orders/[id] —
                            one confirmation pattern per app tier, per the r131 fleet canon). */}
                        <ConfirmDialog
                                open={deleteTarget !== null}
                                onOpenChange={(o) => !o && setDeleteTarget(null)}
                                title="تأكيد الحذف"
                                description={
                                        deleteTarget
                                                ? `هل أنت متأكد من حذف «${deleteTarget.name}»؟ هذا الإجراء لا يمكن التراجع عنه.`
                                                : ''
                                }
                                confirmLabel="حذف"
                                onConfirm={() => delTarget()}
                                destructive
                        />

                        {/* P43 SM-1c: حوار تأكيد الأرشفة الجماعية — نفس نبرة المفرد:
                            غياب من العرض العام + بقاء السجل + استرجاع دائم. */}
                        <ConfirmDialog
                                open={bulkArchiveOpen}
                                onOpenChange={setBulkArchiveOpen}
                                title="أرشفة الأصناف المحددة"
                                description={`سيتم أرشفة ${toArabicNumber(selectedItemIds.size)} ${getArabicPlural(selectedItemIds.size, 'صنف', 'صنفان', 'أصناف')} — تختفي من القائمة العامة وتطبيق الجوال ولن تكون قابلة للطلب، دون حذف أي بيانات: تبقى سجلات طلباتها وتقييماتها سليمة، ويمكنك استرجاعها في أي وقت من لوحة «الأصناف المؤرشفة».`}
                                confirmLabel="أرشفة المحدد"
                                onConfirm={() => applyBulkArchive()}
                                destructive={false}
                        />

                        {/* P42-W3: حوار الأرشفة — نفي صريح للجملة التدميرية للحذف:
                            رسالة تقول بالضبط ما يحدث (غياب من العرض العام + بقاء
                            السجل) وما لا يحدث (لا حذف بيانات). */}
                        <ConfirmDialog
                                open={archiveTarget !== null}
                                onOpenChange={(o) => !o && setArchiveTarget(null)}
                                title="أرشفة الصنف"
                                description={
                                        archiveTarget
                                                ? `سيختفي «${archiveTarget.nameAr || archiveTarget.name}» من القائمة العامة وتطبيق الجوال ولن يكون قابلًا للطلب — دون حذف أي بيانات: يبقى سجل طلباته وتقييماته سليمًا، ويمكنك استرجاعه في أي وقت من لوحة «الأصناف المؤرشفة».`
                                                : ''
                                }
                                confirmLabel="أرشفة"
                                onConfirm={() => archiveItem()}
                                destructive={false}
                        />

                        {/* P45-W1 (البند 3): حوار تأكيد تكرار فئة — العدد الصادق
                            من _count (عدّاد الخادوم الكلي لا الأسطر المحمّلة)،
                            واللاحقة معلنة قبل الإنشاء. غير تدميري بحكم التعريف:
                            إضافة صرفة لا تمس الأصل. */}
                        <ConfirmDialog
                                open={duplicateCatTarget !== null}
                                onOpenChange={(o) => !o && !duplicatingCat && setDuplicateCatTarget(null)}
                                title="تكرار القسم"
                                description={
                                        duplicateCatTarget
                                                ? `سيُنشأ قسم جديد باسم «${withCopySuffix(duplicateCatTarget.nameAr || duplicateCatTarget.name)}» وتُنسخ إليه ${toArabicNumber(duplicateCatTarget._count?.items ?? duplicateCatTarget.items?.length ?? 0)} ${getArabicPlural(duplicateCatTarget._count?.items ?? duplicateCatTarget.items?.length ?? 0, 'صنف', 'صنفان', 'أصناف')} من «${duplicateCatTarget.nameAr || duplicateCatTarget.name}» (الأسعار والخيارات والصور والجدولة كما هي). القسم الأصلي لا يُمسّ، ويُحترم سقف أصناف خطتك — إن اتسع الباقي لجزء فقط توقّف النسخ عند السقف وأُخبرت بالعدد.`
                                                : ''
                                }
                                confirmLabel="تكرار القسم"
                                onConfirm={() => duplicateCategory()}
                                busy={duplicatingCat}
                                destructive={false}
                        />
                </div>
        );
}
