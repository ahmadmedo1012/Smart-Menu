'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Switch } from '@/components/ui/switch';
import { Pencil, Package, GripVertical } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { MotionChevronDown } from '@/components/ui/motion-icons';
import { MotionPlus } from '@/components/ui/motion-icons';
import AnimatedTrash from '@/components/ui/trash-icon';
import SparklesIcon from '@/components/ui/sparkles-icon';
import { cn } from '@/lib/utils';
import { toArabicNumber, formatPrice } from '@/lib/format';
import { type Category, type Item, CATEGORY_ICON_MAP } from './types';

interface CategoriesListProps {
        /** Filtered categories to render (search applied by the page). */
        categories: Category[];
        searchTerm: string;
        expandedCatId: number | null;
        pendingToggleId: number | null;
        onToggleCategory: (id: number) => void;
        onAddItem: (catId: number) => void;
        onEditCategory: (cat: Category) => void;
        onDeleteCategory: (cat: Category) => void;
        onToggleItemStatus: (item: Item) => void;
        onEditItem: (item: Item) => void;
        onDeleteItem: (item: Item) => void;
        onAddCategory: () => void;
}

/** Category cards with their item rows — verbatim extraction from the owner
 * menu page (round89-G3). All row actions are callbacks: the page performs
 * the same state writes the old inline arrows did, in the same order. */
export function CategoriesList({
        categories,
        searchTerm,
        expandedCatId,
        pendingToggleId,
        onToggleCategory,
        onAddItem,
        onEditCategory,
        onDeleteCategory,
        onToggleItemStatus,
        onEditItem,
        onDeleteItem,
        onAddCategory,
}: CategoriesListProps) {
        return (
                /* r131-F5 (A1 P0-3): the hand-rolled 80px gradient-tile empty state
                        joins the shared EmptyState primitive. */
                categories.length === 0 ? (
                        <EmptyState
                                icon={Package}
                                title={searchTerm ? 'لا توجد نتائج' : 'لا توجد تصنيفات'}
                                description={searchTerm ? 'جرب كلمات بحث أخرى' : 'أضف تصنيفاً جديداً لبدء بناء المنيو'}
                                action={
                                        !searchTerm ? (
                                                <Button
                                                        variant="orange"
                                                        size="sm"
                                                        onClick={() => onAddCategory()}
                                                        className="gap-2"
                                                >
                                                        <MotionPlus className="size-4" /> إضافة تصنيف
                                                </Button>
                                        ) : undefined
                                }
                        />
                ) : (
                        <div className="space-y-3">
                                {categories.map((cat) => (
                                        <div
                                                key={cat.id}
                                                className="rounded-md border border-border/30 bg-card/50 overflow-hidden transition-[border-color,box-shadow] hover:border-orange/30 hover:shadow-md focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/60"
                                        >
                                                <div
                                                        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/20"
                                                        onClick={() => onToggleCategory(cat.id)}
                                                >
                                                        <div className="flex items-center gap-3">
                                                                {cat.icon && cat.icon in CATEGORY_ICON_MAP ? (
                                                                        (() => {
                                                                                const I = CATEGORY_ICON_MAP[cat.icon];
                                                                                return <I className="size-6 text-primary" />;
                                                                        })()
                                                                ) : (
                                                                        // r97-X2 [7]: lucide fallback replaces the raw emoji —
                                                                        // unmapped/legacy icon strings render as a proper icon.
                                                                        <Package className="size-6 text-muted-foreground" />
                                                                )}
                                                                <div>
                                                                        <span className="font-bold">{cat.name}</span>
                                                                        {cat.nameAr && (
                                                                                <span className="text-xs text-muted-foreground ms-2">{cat.nameAr}</span>
                                                                        )}
                                                                        <span className="text-xs text-muted-foreground ms-2 bg-muted/50 px-2 py-0.5 rounded-full">
                                                                                {toArabicNumber(cat._count?.items ?? cat.items?.length ?? 0)} صنف
                                                                        </span>
                                                                </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                                <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10"
                                                                        onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onAddItem(cat.id);
                                                                        }}
                                                                        title="إضافة صنف"
                                                                                                                                                aria-label="إضافة صنف"
                                                                                                                                        >
                                                                                                                                                <MotionPlus className="size-4" />
                                                                                                                                                <span className="sr-only sm:not-sr-only sm:inline">إضافة صنف</span>
                                                                                                                                        </Button>
                                                                <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10"
                                                                        onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onEditCategory(cat);
                                                                        }}
                                                                        title="تعديل"
                                                                        aria-label="تعديل"
                                                                >
                                                                        <Pencil className="size-4" />
                                                                </Button>
                                                                <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10 text-destructive"
                                                                        onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onDeleteCategory(cat);
                                                                        }}
                                                                        title="حذف"
                                                                        aria-label="حذف"
                                                                >
                                                                        <AnimatedTrash className="size-4" />
                                                                </Button>
                                                                <MotionChevronDown
                                                                        className={cn(
                                                                                'size-5 text-muted-foreground transition-transform duration-base ms-1',
                                                                                expandedCatId === cat.id && 'rotate-180'
                                                                        )}
                                                                />
                                                        </div>
                                                </div>

                                                {expandedCatId === cat.id && (
                                                        <div className="border-t border-border/20">
                                                                {cat.items?.length > 0 ? (
                                                                        <div className="divide-y divide-border/10">
                                                                                {cat.items.map((item) => (
                                                                                        <div
                                                                                                key={item.id}
                                                                                                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/10 transition-colors group"
                                                                                        >
                                                                                                {/* r121-J-3: hidden below md — HTML5 drag is a pointer
                                                                                                    affordance (never worked on touch); frees 16px+
                                                                                                    gutter for the name column at ≤390px, where the
                                                                                                    row's fixed children ate ~381-391px of 358px. */}
                                                                                                <GripVertical className="size-4 text-muted-foreground/30 shrink-0 cursor-grab opacity-0 group-hover:opacity-100 hidden md:block" />
                                                                                                {item.image ? (
                                                                                                        <OptimizedImage
                                                                                                                src={item.image}
                                                                                                                alt={item.name}
                                                                                                                className="size-10 rounded-md border border-border/30 shrink-0"
                                                                                                                sizes="40px"
                                                                                                                skeleton={false}
                                                                                                        />
                                                                                                ) : (
                                                                                                        <div className="size-10 rounded-md bg-muted/30 flex items-center justify-center shrink-0">
                                                                                                                <Package className="size-4 text-muted-foreground/40" />
                                                                                                        </div>
                                                                                                )}
                                                                                                <div className="flex-1 min-w-0">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                                <span
                                                                                                                        className={cn(
                                                                                                                                'font-medium text-sm',
                                                                                                                                item.status !== 'available' &&
                                                                                                                                        'text-muted-foreground/50 line-through'
                                                                                                                        )}
                                                                                                                >
                                                                                                                        {item.name}
                                                                                                                </span>
                                                                                                                {item.nameAr && (
                                                                                                                        <span className="text-xs text-muted-foreground/60 hidden sm:inline">
                                                                                                                                {item.nameAr}
                                                                                                                        </span>
                                                                                                                )}
                                                                                                                {item.isFeatured && (
                                                                                                                        <span
                                                                                                                                title="مميز — يظهر في القسم السينمائي"
                                                                                                                                className="inline-flex items-center gap-0.5 text-3xs font-bold text-ember dark:text-saffron bg-orange/10 border border-orange/25 rounded-full px-1.5 py-0.5"
                                                                                                                        >
                                                                                                                                <SparklesIcon className="size-2.5" aria-hidden="true" />
                                                                                                                        </span>
                                                                                                                )}
                                                                                                        </div>
                                                                                                        {item.description && (
                                                                                                                <p className="text-xs text-muted-foreground/50 truncate max-w-md">
                                                                                                                        {item.description}
                                                                                                                </p>
                                                                                                        )}
                                                                                                </div>
                                                                                                <div className="text-end shrink-0 tabular-nums whitespace-nowrap">
                                                                                                        <span
                                                                                                                className={cn(
                                                                                                                        'font-bold text-sm tabular-nums',
                                                                                                                        item.discountedPrice && 'text-destructive'
                                                                                                                )}
                                                                                                        >
                                                                                                                {/* r121-H-1: smart formatPrice default (r120 contract) —
                                                                                                                    was forced decimals:1 («12.0»); suffix '' keeps the
                                                                                                                    separate د.ل span. */}
                                                                                                                {formatPrice(item.discountedPrice ?? item.price, { suffix: '' })}
                                                                                                        </span>
                                                                                                        <span className="text-xs text-muted-foreground ms-0.5">د.ل</span>
                                                                                                        {item.discountedPrice && (
                                                                                                                <span className="text-xs text-muted-foreground/50 line-through block tabular-nums">
                                                                                                                        {formatPrice(item.price, { suffix: '' })}
                                                                                                                </span>
                                                                                                        )}
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2">
                                                                                                        <Switch
                                                                                                                size="sm"
                                                                                                                checked={item.status === 'available'}
                                                                                                                disabled={pendingToggleId === item.id}
                                                                                                                onCheckedChange={() => onToggleItemStatus(item)}
                                                                                                aria-label={`تغيير حالة توفر ${item.name}`}
                                                                                                        />
                                                                                                        <span
                                                                                                                className={cn(
                                                                                                                        // r121-J-3: hidden below sm — the Switch + its
                                                                                                                        // aria-label already carry the availability state;
                                                                                                                        // the w-14 word was eating 56px of the ≤390px row.
                                                                                                                        'text-xs w-14 hidden sm:inline',
                                                                                                                        item.status === 'available' ? 'text-success' : 'text-destructive'
                                                                                                                )}
                                                                                                        >
                                                                                                                {item.status === 'available' ? 'متوفر' : 'غير متوفر'}
                                                                                                        </span>
                                                                                                </div>
                                                                                                <div className="flex gap-0.5">
                                                                                                        <Button
                                                                                                                variant="ghost"
                                                                                                                size="icon"
                                                                                                                className="h-10 w-10"
                                                                                                                onClick={() => onEditItem(item)}
                                                                                                                title="تعديل"
                                                                                                        >
                                                                                                                <Pencil className="size-3.5" />
                                                                                                        </Button>
                                                                                                        <Button
                                                                                                                variant="ghost"
                                                                                                                size="icon"
                                                                                                                className="h-10 w-10 text-destructive"
                                                                                                                onClick={() => onDeleteItem(item)}
                                                                                                                title="حذف"
                                                                                                        >
                                                                                                                <AnimatedTrash className="size-3.5" />
                                                                                                        </Button>
                                                                                                </div>
                                                                                        </div>
                                                                                ))}
                                                                        </div>
                                                                ) : (
                                                                        <div className="py-8 text-center">
                                                                                <p className="text-sm text-muted-foreground mb-3">
                                                                                        لا توجد أصناف في هذا التصنيف
                                                                                </p>
                                                                                <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() => onAddItem(cat.id)}
                                                                                        className="gap-1 border-orange/30 text-accent-foreground hover:bg-orange-muted"
                                                                                >
                                                                                        <MotionPlus className="size-3.5" /> إضافة صنف
                                                                                </Button>
                                                                        </div>
                                                                )}
                                                        </div>
                                                )}
                                        </div>
                                ))}
                        </div>
                )
        );
}
