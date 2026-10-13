/**
 * Phase 6 (P6-2-cR): «إدارة المنيو» becomes a REAL screen — the web
 * /owner/menu twin on the typed OWNER API:
 *
 *   · restaurant pick (chips when the owner runs multiple menus; primary
 *     is the default) → categories list (_count items) → per-category
 *     items list
 *   · item availability toggle — PARTIAL PUT (status-only body is safe:
 *     the web updateSchema never overwrites omitted fields)
 *   · basic create/edit item sheet (name, price, description, available)
 *   · destructive delete confirm
 *
 * HONEST SCOPE (web-only, deliberately):
 *   · modifier-group editing (مجموعات الخيارات) — the full replace-strategy
 *     editor lives in the web ItemDialog; the mobile sheet edits the core
 *     fields only, and sends NO modifierGroups key (omitted → untouched).
 *   · category create/edit/delete, item images, showcase/featured fields —
 *     same web console surface. No fake controls ship here.
 *
 * Warm grammar: Baloo headers, DotLeader price rows, shape skeletons,
 * 56px empty wells, pull-to-refresh, 44px targets, destructive confirms.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, RefreshControl, Alert, TextInput, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2, ChevronRight, ChevronLeft, UtensilsCrossed, Package, Coffee, Pizza, CupSoda, IceCream, Apple, Beef, Fish, Milk, X, Check } from "lucide-react-native";
import Animated from "react-native-reanimated";

import {
  getOwnerRestaurants,
  getOwnerCategories,
  getOwnerItems,
  setOwnerItemAvailability,
  createOwnerItem,
  updateOwnerItem,
  deleteOwnerItem,
  type OwnerCategory,
  type OwnerItem,
} from "@/services/api/client";
import { EmptyState, ErrorState } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { DotLeader } from "@/components/DotLeader";
import { PressableScale } from "@/components/motion/PressableScale";
import { useEnterFade } from "@/components/motion/useEnterFade";
import { AppBottomSheet, type AppBottomSheetHandle } from "@/components/shared/AppBottomSheet";
import { fieldFocusBorderStyle } from "@/components/ui/Input";
import { colors, pastelFamilies } from "@/theme/colors";
import { METRIC_FONT_VARIANT } from "@/theme/typography";
import { toArabicNumber, formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "@/app/providers";
import { useNavigation } from "@react-navigation/native";
import type { RootNavigation } from "@/navigation/types";

/** The web CATEGORY_ICON_MAP twin — known lucide names render as glyphs;
 * anything else (legacy emoji strings from the auto-seed) renders as text. */
const CATEGORY_GLYPHS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Package, Coffee, Pizza, CupSoda, IceCream, Apple, Beef, Fish, UtensilsCrossed, Milk,
};

function CategoryIcon({ icon }: { icon: string | null }) {
  const Glyph = icon ? CATEGORY_GLYPHS[icon] : undefined;
  if (Glyph) return <Glyph size={20} color={colors.terracotta} />;
  return (
    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18 }}>{icon || "🍽️"}</Text>
  );
}

export function OwnerMenuScreen() {
  const navigation = useNavigation<RootNavigation>();
  const enterFade = useEnterFade();

  // ── restaurant scope (web useActiveRestaurant twin: primary by default) ──
  const { data: restaurants, isPending: restaurantsPending, error: restaurantsError, refetch: refetchRestaurants } = useQuery({
    queryKey: ["owner-restaurants"],
    queryFn: getOwnerRestaurants,
  });
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  useEffect(() => {
    if (restaurantId === null && restaurants && restaurants.length > 0) {
      setRestaurantId((restaurants.find((r) => r.isPrimary) ?? restaurants[0]).id);
    }
  }, [restaurants, restaurantId]);
  const activeRestaurant = restaurants?.find((r) => r.id === restaurantId) ?? null;

  // ── categories of the active restaurant ──
  const {
    data: categories, isPending: categoriesPending, error: categoriesError,
    refetch: refetchCategories, isRefetching: categoriesRefreshing,
  } = useQuery({
    queryKey: ["owner-categories", restaurantId],
    queryFn: () => getOwnerCategories(restaurantId!),
    enabled: restaurantId !== null,
  });

  // ── drill-down state (categories list ⇄ one category's items) ──
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const activeCategory: OwnerCategory | null = useMemo(
    () => categories?.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );
  // Leaving the restaurant scope resets the drill-down.
  useEffect(() => { setCategoryId(null); }, [restaurantId]);

  const {
    data: items, isPending: itemsPending, error: itemsError,
    refetch: refetchItems, isRefetching: itemsRefreshing,
  } = useQuery({
    queryKey: ["owner-items", categoryId],
    queryFn: () => getOwnerItems(categoryId!),
    enabled: categoryId !== null,
  });

  const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);
  // create / edit sheet state (null = closed)
  const [sheet, setSheet] = useState<{ categoryId: number; item: OwnerItem | null } | null>(null);

  const toggleAvailability = async (item: OwnerItem) => {
    const next = item.status === "available" ? "unavailable" : "available";
    setPendingToggleId(item.id);
    try {
      await setOwnerItemAvailability(item.id, next);
      toast.success(next === "available" ? "الصنف متاح الآن" : "الصنف غير متاح الآن");
      void refetchItems();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "تعذّر تحديث حالة الصنف"));
    } finally {
      setPendingToggleId(null);
    }
  };

  const confirmDeleteItem = (item: OwnerItem) => {
    Alert.alert(
      "حذف الصنف",
      `سيُحذف «${item.nameAr || item.name}» نهائيًا من المنيو.`,
      [
        { text: "رجوع", style: "cancel" },
        { text: "حذف الصنف", style: "destructive", onPress: () => { void doDeleteItem(item); } },
      ],
      { cancelable: true },
    );
  };

  const doDeleteItem = async (item: OwnerItem) => {
    try {
      await deleteOwnerItem(item.id);
      toast.success("تم حذف الصنف");
      void refetchItems();
      void refetchCategories();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "تعذّر حذف الصنف"));
    }
  };

  // ── loading / error guards (restaurant scope first, then the drill-in) ──
  if (restaurantsPending) {
    return <MenuSkeleton />;
  }
  if (restaurantsError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <ErrorState message={getErrorMessage(restaurantsError, "تعذّر تحميل مطاعمك")} onRetry={() => { void refetchRestaurants(); }} />
      </SafeAreaView>
    );
  }
  if (!activeRestaurant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <EmptyState
          title="لا توجد مطاعم"
          description="أضف مطعمك أولًا ثم عد لإدارة المنيو"
          icon={<UtensilsCrossed size={24} color={pastelFamilies.grey.deep} />}
        />
        <Button title="إضافة منيو جديد" onPress={() => navigation.navigate("OwnerRestaurants")} className="mx-4" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={
          <RefreshControl
            refreshing={categoryId === null ? categoriesRefreshing : itemsRefreshing}
            onRefresh={() => { (categoryId === null ? refetchCategories : refetchItems)(); void refetchRestaurants(); }}
            tintColor={colors.terracotta}
          />
        }>
          <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 12 }}>إدارة المنيو</Text>

          {/* Multi-menu scope chips (single menu stays quiet). */}
          {restaurants && restaurants.length > 1 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {restaurants.map((r) => {
                const selected = r.id === restaurantId;
                return (
                  <PressableScale
                    key={r.id}
                    onPress={() => setRestaurantId(r.id)}
                    hitSlop={4}
                    accessibilityLabel={`منيو ${r.name}`}
                    accessibilityState={{ selected }}
                    style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9999, backgroundColor: selected ? colors.terracotta : colors.surface, borderWidth: 1, borderColor: selected ? colors.terracotta : colors.hairline }}
                  >
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: selected ? colors.onAccent : colors.muted }} maxFontSizeMultiplier={1.4}>{r.name}</Text>
                  </PressableScale>
                );
              })}
            </View>
          ) : null}

          {categoryId === null ? (
            /* ── categories list (create/edit of CATEGORIES itself stays
               web-only — the honest scope note at the top of this file). ── */
            categoriesError ? (
              <ErrorState message={getErrorMessage(categoriesError, "تعذّر تحميل الأقسام")} onRetry={() => { void refetchCategories(); }} />
            ) : categoriesPending ? (
              <View style={{ gap: 8 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.hairline }}>
                    <Skeleton width={40} height={40} borderRadius={12} />
                    <View style={{ gap: 6, flex: 1 }}>
                      <Skeleton width={"50%"} height={14} />
                      <Skeleton width={"30%"} height={11} />
                    </View>
                    <Skeleton width={20} height={16} />
                  </View>
                ))}
              </View>
            ) : !categories || categories.length === 0 ? (
              <EmptyState
                title="لا توجد أقسام"
                description="أنشئ أقسام المنيو من لوحة التحكم على الويب وستظهر هنا فورًا"
                icon={<Package size={24} color={pastelFamilies.grey.deep} />}
              />
            ) : (
              <View style={{ gap: 8 }}>
                {categories.map((cat) => (
                  <PressableScale
                    key={cat.id}
                    scaleTo={0.99}
                    onPress={() => setCategoryId(cat.id)}
                    accessibilityLabel={`قسم ${cat.name} — ${toArabicNumber(cat._count?.items ?? 0)} صنف`}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.hairline }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.terracottaSoft, alignItems: "center", justifyContent: "center" }}>
                      <CategoryIcon icon={cat.icon} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 16, fontWeight: "700", color: colors.ink }} numberOfLines={1}>{cat.name}</Text>
                      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 2, fontVariant: METRIC_FONT_VARIANT }}>
                        {toArabicNumber(cat._count?.items ?? 0)} صنف
                        {cat.nameAr ? ` · ${cat.nameAr}` : ""}
                      </Text>
                    </View>
                    {/* RTL forward affordance — the drill-in points at the
                        END side (left in forced-RTL), the back link below
                        points at the START side (right). */}
                    <ChevronLeft size={20} color={colors.muted} />
                  </PressableScale>
                ))}
              </View>
            )
          ) : (
            /* ── one category's items (the drill-in) ── */
            <View>
              <PressableScale
                onPress={() => setCategoryId(null)}
                hitSlop={4}
                accessibilityLabel="العودة إلى كل الأقسام"
                style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 8, marginStart: -8 }}
              >
                <ChevronRight size={18} color={colors.terracotta} />
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.terracotta }}>كل الأقسام</Text>
              </PressableScale>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 18, fontWeight: "700", color: colors.ink, flexShrink: 1 }} numberOfLines={1}>
                  {activeCategory?.name ?? ""}
                </Text>
                <Button title="صنف جديد" onPress={() => setSheet({ categoryId, item: null })} className="shrink-0" />
              </View>

              {itemsError ? (
                <ErrorState message={getErrorMessage(itemsError, "تعذّر تحميل الأصناف")} onRetry={() => { void refetchItems(); }} />
              ) : itemsPending ? (
                <View style={{ gap: 8 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.hairline, gap: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Skeleton width={"45%"} height={13} />
                        <Skeleton width={56} height={13} />
                      </View>
                      <Skeleton width={"70%"} height={11} />
                      <Skeleton width={88} height={32} borderRadius={14} />
                    </View>
                  ))}
                </View>
              ) : !items || items.length === 0 ? (
                <EmptyState
                  title="لا توجد أصناف"
                  description="أضف أول صنف لهذا القسم"
                  icon={<UtensilsCrossed size={24} color={pastelFamilies.grey.deep} />}
                />
              ) : (
                <View style={{ gap: 8 }}>
                  {items.map((item) => (
                    <View key={item.id} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.hairline }}>
                      {/* Phase 6: قائد النقاط — the item line ends at its price
                          through the printed-menu dotted leader. */}
                      <DotLeader
                        leading={<Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, flexShrink: 1 }} numberOfLines={1}>{item.nameAr || item.name}</Text>}
                        trailing={
                          item.discountedPrice != null ? (
                            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.terracottaPressed, fontVariant: METRIC_FONT_VARIANT }}>{formatPrice(item.discountedPrice)}</Text>
                          ) : (
                            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.terracottaPressed, fontVariant: METRIC_FONT_VARIANT }}>{formatPrice(item.price)}</Text>
                          )
                        }
                      />
                      {item.description ? (
                        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 17 }} numberOfLines={2}>{item.description}</Text>
                      ) : null}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                        {/* Availability toggle — a status pill, not a fake
                            control: busy state while the PUT is in flight. */}
                        <PressableScale
                          onPress={() => { void toggleAvailability(item); }}
                          disabled={pendingToggleId === item.id}
                          hitSlop={4}
                          accessibilityLabel={item.status === "available" ? `إخفاء ${item.name}` : `إتاحة ${item.name}`}
                          accessibilityState={{ busy: pendingToggleId === item.id }}
                          style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: item.status === "available" ? colors.mintBg : colors.roseBg, opacity: pendingToggleId === item.id ? 0.45 : 1 }}
                        >
                          <View style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: item.status === "available" ? colors.mint : colors.rose }} />
                          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: item.status === "available" ? colors.mint : colors.rose }} maxFontSizeMultiplier={1.4}>
                            {item.status === "available" ? "متاح" : "غير متاح"}
                          </Text>
                        </PressableScale>
                        <View style={{ flex: 1 }} />
                        <PressableScale
                          onPress={() => setSheet({ categoryId, item })}
                          hitSlop={4}
                          accessibilityLabel={`تعديل ${item.name}`}
                          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}
                        >
                          <Pencil size={16} color={colors.ink} />
                        </PressableScale>
                        <PressableScale
                          onPress={() => confirmDeleteItem(item)}
                          hitSlop={4}
                          accessibilityLabel={`حذف ${item.name}`}
                          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.roseBg, alignItems: "center", justifyContent: "center" }}
                        >
                          <Trash2 size={16} color={colors.rose} />
                        </PressableScale>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* create / edit sheet — the basic-fields editor (modifier groups,
          images and showcase fields stay web-only; see the file header). */}
      {sheet ? (
        <ItemSheet
          categoryId={sheet.categoryId}
          item={sheet.item}
          onClose={() => setSheet(null)}
          onSaved={() => { void refetchItems(); void refetchCategories(); }}
        />
      ) : null}
    </SafeAreaView>
  );
}

/** The menu tab's first paint — heading + (optional chip row) + category-row
 *  skeletons, the loaded geometry (r133-F3 shape-skeleton ruling). */
function MenuSkeleton() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      <View style={{ padding: 16 }}>
        <Skeleton width={"45%"} height={22} />
        <Skeleton width={"30%"} height={14} />
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginTop: 8, borderWidth: 1, borderColor: colors.hairline }}>
            <Skeleton width={40} height={40} borderRadius={12} />
            <View style={{ gap: 6, flex: 1 }}>
              <Skeleton width={"50%"} height={14} />
              <Skeleton width={"30%"} height={11} />
            </View>
            <Skeleton width={20} height={16} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

/** Create/edit item sheet — name, price, description, availability. */
function ItemSheet({ categoryId, item, onClose, onSaved }: {
  categoryId: number;
  item: OwnerItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const sheetRef = useRef<AppBottomSheetHandle>(null);
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [available, setAvailable] = useState(item ? item.status === "available" : true);
  const [focusedField, setFocusedField] = useState<"name" | "price" | "description" | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = item !== null;

  const close = () => sheetRef.current?.dismiss();
  // Hardware back closes the sheet first (the U6-#2 pattern).
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { sheetRef.current?.dismiss(); return true; });
    return () => sub.remove();
  }, []);

  const save = async () => {
    const trimmedName = name.trim();
    const priceNum = Number(price.replace(",", "."));
    if (!trimmedName) {
      toast.error("اسم الصنف مطلوب");
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error("أدخل سعرًا صحيحًا");
      return;
    }
    setSaving(true);
    try {
      if (editing && item) {
        // Partial PUT — name/price/description/status only; every other
        // stored field (image, modifiers, showcase) stays untouched.
        await updateOwnerItem(item.id, {
          name: trimmedName,
          price: priceNum,
          description: description.trim(),
          status: available ? "available" : "unavailable",
        });
        toast.success("تم تحديث الصنف");
      } else {
        await createOwnerItem({
          name: trimmedName,
          price: priceNum,
          description: description.trim(),
          status: available ? "available" : "unavailable",
          categoryId,
        });
        toast.success("تم إضافة الصنف");
      }
      onSaved();
      close();
    } catch (e: unknown) {
      // 403 plan cap / 422 validation arrive with Arabic reasons.
      toast.error(getErrorMessage(e, editing ? "تعذّر تحديث الصنف" : "تعذّر إضافة الصنف"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppBottomSheet
      ref={sheetRef}
      snapPoints={["70%", "92%"]}
      onClose={onClose}
      header={
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 18, fontWeight: "700", color: colors.ink, flex: 1 }} numberOfLines={1}>{editing ? "تعديل الصنف" : "صنف جديد"}</Text>
          <PressableScale onPress={() => sheetRef.current?.dismiss()} hitSlop={12} accessibilityLabel="إغلاق نموذج الصنف">
            <X size={20} color={colors.muted} />
          </PressableScale>
        </View>
      }
      footer={
        <Button title={editing ? "حفظ التعديلات" : "إضافة الصنف"} onPress={() => { void save(); }} loading={saving} className="w-full" />
      }
    >
      <View style={{ gap: 14, paddingTop: 4 }}>
        {/* SCOPE NOTE (honest): the web ItemDialog also edits modifier groups
            (مجموعات الخيارات), the image and showcase fields — this mobile
            sheet intentionally edits the CORE fields only. */}
        <View>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6 }}>اسم الصنف</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="مثال: كبسة دجاج"
            placeholderTextColor={colors.muted}
            accessibilityLabel="اسم الصنف"
            onFocus={() => setFocusedField("name")}
            onBlur={() => setFocusedField(null)}
            style={{ minHeight: 44, borderRadius: 14, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, ...fieldFocusBorderStyle(focusedField === "name") }}
          />
        </View>
        <View>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6 }}>السعر (د.ل)</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="0"
            placeholderTextColor={colors.muted}
            accessibilityLabel="سعر الصنف"
            keyboardType="decimal-pad"
            onFocus={() => setFocusedField("price")}
            onBlur={() => setFocusedField(null)}
            style={{ minHeight: 44, borderRadius: 14, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, textAlign: "left", fontVariant: METRIC_FONT_VARIANT, ...fieldFocusBorderStyle(focusedField === "price") }}
          />
        </View>
        <View>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6 }}>الوصف</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="وصف قصير للصنف (اختياري)"
            placeholderTextColor={colors.muted}
            accessibilityLabel="وصف الصنف"
            multiline
            onFocus={() => setFocusedField("description")}
            onBlur={() => setFocusedField(null)}
            style={{ minHeight: 72, borderRadius: 14, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, textAlignVertical: "top", ...fieldFocusBorderStyle(focusedField === "description") }}
          />
        </View>
        <View>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6 }}>الحالة</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[true, false].map((value) => {
              const selected = available === value;
              return (
                <PressableScale
                  key={value ? "y" : "n"}
                  onPress={() => setAvailable(value)}
                  hitSlop={4}
                  accessibilityLabel={value ? "الصنف متاح" : "الصنف غير متاح"}
                  accessibilityState={{ selected }}
                  style={{ flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, borderWidth: 1, borderColor: selected ? (value ? colors.mint : colors.rose) : colors.hairline, backgroundColor: selected ? (value ? colors.mintBg : colors.roseBg) : colors.surface2 }}
                >
                  {selected ? <Check size={16} color={value ? colors.mint : colors.rose} /> : null}
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: selected ? (value ? colors.mint : colors.rose) : colors.muted }} maxFontSizeMultiplier={1.4}>{value ? "متاح" : "غير متاح"}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      </View>
    </AppBottomSheet>
  );
}
