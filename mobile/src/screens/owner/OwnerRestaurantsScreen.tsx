/**
 * Phase 6 (P6-2-cR): «فروعي» becomes a REAL screen — the web
 * /owner/restaurants twin on the typed OWNER API (P6-2-cR client.ts):
 *
 *   · list — name + /menu/slug + _count stats (categories/orders)
 *   · add-restaurant form (name + legal slug + optional description)
 *   · copy-slug action (expo-clipboard + toast)
 *   · set-primary (PATCH isPrimary) — mirrors the web row action
 *   · delete with a destructive confirm (primary menus refuse, the server
 *     also guards: 400 primary / 409 orders-present)
 *
 * Loading = shape skeletons, error = retry state, empty = the 56px well +
 * CTA — the warm state grammar every owner screen rides. Pull-to-refresh
 * where the family uses it. The restaurants cache key ["owner-restaurants"]
 * is SHARED with OwnerQr (same typed queryFn) so a create/delete here
 * refreshes the QR screen on focus.
 */
import { useState } from "react";
import { View, ScrollView, RefreshControl, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Store, Copy, Star, Trash2 } from "lucide-react-native";
import Animated from "react-native-reanimated";

import {
  getOwnerRestaurants,
  createOwnerRestaurant,
  setPrimaryOwnerRestaurant,
  deleteOwnerRestaurant,
  type OwnerRestaurant,
} from "@/services/api/client";
import { EmptyState, ErrorState } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { useEnterFade } from "@/components/motion/useEnterFade";
import { fieldFocusBorderStyle } from "@/components/ui/Input";
import { colors, pastelFamilies } from "@/theme/colors";
import { METRIC_FONT_VARIANT } from "@/theme/typography";
import { toArabicNumber } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "@/app/providers";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "https://menu.smart-link.ly";

/** The web slug recipe (owner/restaurants/page.tsx): lowercase latin/dash
 * only — illegal characters fold to "-" as the owner types. */
function sanitizeSlug(raw: string): string {
  return raw.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

export function OwnerRestaurantsScreen() {
  const enterFade = useEnterFade();
  const queryClient = useQueryClient();

  const { data: restaurants, isPending, error, refetch, isRefetching } = useQuery({
    queryKey: ["owner-restaurants"],
    queryFn: getOwnerRestaurants,
  });

  // ── add-restaurant form (web addMenu twin: name + slug + description) ──
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: "", slug: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<"name" | "slug" | "description" | null>(null);

  const refresh = () => {
    void refetch();
    // The QR screen rides the same key — a menu added/removed here must
    // not leave a stale QR (or a dead QR) behind.
    void queryClient.invalidateQueries({ queryKey: ["owner-restaurants"] });
  };

  const addMenu = async () => {
    if (!draft.name.trim() || !draft.slug.trim()) {
      toast.error("اسم المنيو والرابط مطلوبان");
      return;
    }
    setSaving(true);
    try {
      await createOwnerRestaurant({
        name: draft.name.trim(),
        slug: sanitizeSlug(draft.slug.trim()),
        description: draft.description.trim(),
      });
      toast.success("تم إضافة المنيو بنجاح");
      setShowAdd(false);
      setDraft({ name: "", slug: "", description: "" });
      refresh();
    } catch (e: unknown) {
      // Server carries the Arabic reason (409 slug taken / 403 plan cap).
      toast.error(getErrorMessage(e, "تعذّر إضافة المنيو"));
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (r: OwnerRestaurant) => {
    try {
      await Clipboard.setStringAsync(`${DOMAIN}/menu/${r.slug}`);
      toast.success("تم نسخ رابط المنيو");
    } catch {
      toast.error("تعذّر نسخ الرابط");
    }
  };

  const setPrimary = async (r: OwnerRestaurant) => {
    try {
      await setPrimaryOwnerRestaurant(r.id);
      toast.success("تم تعيين المنيو كأساسي");
      refresh();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "تعذّر تعيين المنيو الأساسي"));
    }
  };

  const confirmDelete = (r: OwnerRestaurant) => {
    // Web ConfirmDialog twin — destructive action needs an explicit stop.
    Alert.alert(
      "حذف المنيو",
      `سيتم حذف المنيو «${r.name}» نهائيًا مع كل الأصناف والطلبات المرتبطة به.`,
      [
        { text: "رجوع", style: "cancel" },
        { text: "حذف المنيو", style: "destructive", onPress: () => { void doDelete(r); } },
      ],
      { cancelable: true },
    );
  };

  const doDelete = async (r: OwnerRestaurant) => {
    try {
      await deleteOwnerRestaurant(r.id);
      toast.success("تم حذف المنيو");
      refresh();
    } catch (e: unknown) {
      // 400 primary-refusal / 409 orders-present arrive with Arabic reasons.
      toast.error(getErrorMessage(e, "تعذّر حذف المنيو"));
    }
  };

  if (isPending) {
    /* Shape skeleton — the loaded card geometry (Store well + name/slug
       lines + stats line + action row) × 4, the family r133-F3 ruling. */
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <View style={{ padding: 16 }}>
          <Skeleton width={"60%"} height={44} borderRadius={14} />
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginTop: 12, borderWidth: 1, borderColor: colors.hairline }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Skeleton width={40} height={40} borderRadius={12} />
                <View style={{ gap: 6, flex: 1 }}>
                  <Skeleton width={"55%"} height={14} />
                  <Skeleton width={"40%"} height={11} />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Skeleton width={72} height={11} />
                <Skeleton width={64} height={11} />
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Skeleton width={96} height={32} borderRadius={14} />
                <Skeleton width={88} height={32} borderRadius={14} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <ErrorState message={getErrorMessage(error, "تعذّر تحميل المنيوهات")} onRetry={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.terracotta} />}>
          <Button
            title={showAdd ? "إغلاق النموذج" : "إضافة منيو جديد"}
            variant={showAdd ? "outline" : "primary"}
            onPress={() => setShowAdd((s) => !s)}
            className="w-full"
          />

          {/* Add form — the web r131-F5 card twin (44px fields, focus halo). */}
          {showAdd ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: colors.hairline, gap: 12 }}>
              <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 18, fontWeight: "700", color: colors.ink }}>منيو جديد</Text>
              <View>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6 }}>اسم المطعم</Text>
                <TextInput
                  value={draft.name}
                  onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))}
                  placeholder="مثال: مطعم الجبل"
                  placeholderTextColor={colors.muted}
                  accessibilityLabel="اسم المطعم"
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  style={{ minHeight: 44, borderRadius: 14, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, ...fieldFocusBorderStyle(focusedField === "name") }}
                />
              </View>
              <View>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6 }}>الرابط المختصر</Text>
                <View style={{ flexDirection: "row", alignItems: "stretch" }}>
                  <View style={{ backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.hairline, borderEndWidth: 0, borderTopStartRadius: 14, borderBottomStartRadius: 14, paddingHorizontal: 12, minHeight: 44, justifyContent: "center" }}>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted }}>/menu/</Text>
                  </View>
                  <TextInput
                    value={draft.slug}
                    onChangeText={(t) => setDraft((d) => ({ ...d, slug: sanitizeSlug(t) }))}
                    placeholder="al-jabal"
                    placeholderTextColor={colors.muted}
                    accessibilityLabel="الرابط المختصر"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocusedField("slug")}
                    onBlur={() => setFocusedField(null)}
                    style={{ flex: 1, minHeight: 44, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, textAlign: "left", ...fieldFocusBorderStyle(focusedField === "slug") }}
                  />
                </View>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 6 }}>حروف إنجليزية وأرقام وشرطات فقط</Text>
              </View>
              <View>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6 }}>الوصف</Text>
                <TextInput
                  value={draft.description}
                  onChangeText={(t) => setDraft((d) => ({ ...d, description: t }))}
                  placeholder="وصف المطعم (اختياري)"
                  placeholderTextColor={colors.muted}
                  accessibilityLabel="وصف المطعم"
                  onFocus={() => setFocusedField("description")}
                  onBlur={() => setFocusedField(null)}
                  style={{ minHeight: 44, borderRadius: 14, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, ...fieldFocusBorderStyle(focusedField === "description") }}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button title="إلغاء" variant="outline" onPress={() => setShowAdd(false)} className="flex-1" />
                <Button title="إضافة" onPress={() => { void addMenu(); }} loading={saving} className="flex-1" />
              </View>
            </View>
          ) : null}

          {restaurants && restaurants.length === 0 ? (
            <View style={{ flexGrow: 1 }}>
              <EmptyState
                title="لا يوجد منيوهات بعد"
                description="أضف منيو جديد ليصبح لكل مطعم رابط خاص ورمز QR."
                icon={<Store size={24} color={pastelFamilies.grey.deep} />}
              />
              <Button title="إضافة منيو جديد" onPress={() => setShowAdd(true)} className="mx-4" />
            </View>
          ) : (
            restaurants?.map((r) => (
              <View key={r.id} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 12, marginTop: 12, borderWidth: 1, borderColor: colors.hairline }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.terracottaSoft, alignItems: "center", justifyContent: "center" }}>
                    <Store size={20} color={colors.terracotta} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 16, fontWeight: "700", color: colors.ink, flexShrink: 1 }} numberOfLines={1}>{r.name}</Text>
                      {r.isPrimary ? (
                        <View style={{ backgroundColor: colors.terracottaSoft, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 10, fontWeight: "600", color: colors.terracottaPressed }}>الأساسي</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 2, textAlign: "left" }} numberOfLines={1} selectable>/menu/{r.slug}</Text>
                  </View>
                </View>

                {r.description ? (
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 18 }} numberOfLines={2}>{r.description}</Text>
                ) : null}

                <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, fontVariant: METRIC_FONT_VARIANT }}>{toArabicNumber(r._count?.categories ?? 0)} أقسام</Text>
                  <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, fontVariant: METRIC_FONT_VARIANT }}>{toArabicNumber(r._count?.orders ?? 0)} طلبات</Text>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  <RowAction icon={<Copy size={16} color={colors.ink} />} label="نسخ الرابط" onPress={() => { void copyLink(r); }} />
                  {!r.isPrimary ? (
                    <RowAction icon={<Star size={16} color={colors.ink} />} label="تعيين أساسي" onPress={() => { void setPrimary(r); }} />
                  ) : null}
                  {/* Destructive: primary menus refuse (web disables the row's
                      delete; the server re-guards with 400/409). */}
                  <RowAction
                    icon={<Trash2 size={16} color={r.isPrimary ? colors.muted : colors.rose} />}
                    label="حذف"
                    onPress={() => confirmDelete(r)}
                    disabled={r.isPrimary}
                  />
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

/** Compact row action — 44px touch floor via minHeight + centered glyph. */
function RowAction({ icon, label, onPress, disabled }: { icon: React.ReactNode; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityLabel={label}
      accessibilityState={disabled ? { disabled: true } : undefined}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: colors.surface2, opacity: disabled ? 0.45 : 1 }}
    >
      {icon}
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: colors.ink }} maxFontSizeMultiplier={1.4}>{label}</Text>
    </PressableScale>
  );
}
