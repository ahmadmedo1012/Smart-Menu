/**
 * P42-5b (GAP-X1) — «ترقية الخطة»: the owner-reachable upgrade flow, the
 * native twin of what the web CTA's destination DOES for a signed-in owner.
 *
 * WHY A DEDICATED SCREEN (the honest trace): the web lock CTAs are
 * `Link href="/subscribe"` (PlanFeatureLock.tsx:44,70) — the page then probes
 * /api/auth/me and an owner with a restaurantId lands in UPGRADE mode
 * (SubscribeClient.tsx:149-156): plan picker (paid plans only,
 * PlanSelector.tsx:30) → pay-only summary «بيانات مطعمك الحالية ستبقى كما هي
 * — فقط سيتم ترقية خطتك.» (PaymentSection.tsx:46) → PaymentDialog →
 * POST /api/subscriptions/upgrade { planId, phone, provider, amount,
 * upgradeRestaurantId } (PaymentDialog.tsx:145-166).
 *
 * The EXISTING native subscribe wizard (AuthStack: SubscribePlan →
 * SubscribeMenu → SubscribePayment) is the NEW-SIGNUP flow — it creates temp
 * restaurant data and POSTs /api/subscriptions. RootNavigator only mounts it
 * for non-owner roles (RootNavigator.tsx:185-193 — owners always get
 * OwnerStack), and routing a cap-blocked OWNER into a new-signup wizard
 * would be a dishonest dead end. This screen ports the web's upgrade mode
 * instead; the wizard stays byte-identical.
 *
 * RESTAURANT CONTEXT (mirroring the web CTA): the web CTA passes NONE — the
 * destination self-resolves the target from /api/auth/me (user.restaurantId,
 * the account's primary link; the upgrade route accepts any
 * UserRestaurant-linked target — upgrade/route.ts:107-117). The lock sheet
 * may pass the CAPPED restaurant's id when the surface knows it (the menu
 * screen's active restaurant); otherwise this screen falls back to the auth
 * store — the exact web resolution.
 *
 * HONEST SCOPE (deliberately NOT here): bank-transfer upgrades. The wallet
 * families (libyana/madar) carry the ≤99 LYD server cap; above it the
 * server itself demands bank transfer («المبالغ فوق 99 د.ل تتطلب تحويل
 * بنكي» — upgrade/route.ts:60-68) and the bank form (sender account fields +
 * receipt image) exists on the web dashboard only. The screen says so with
 * the server's own copy instead of faking a bank flow that cannot succeed.
 */
import { useState } from "react";
import { View, ScrollView, TextInput } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react-native";
import Animated from "react-native-reanimated";

import { api } from "@/services/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, EmptyState } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { useEnterFade } from "@/components/motion/useEnterFade";
import { useAuth } from "@/store/auth";
import { toast } from "@/app/providers";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { fieldFocusBorderStyle } from "@/components/ui/Input";
import { colors } from "@/theme/colors";
import { METRIC_FONT_VARIANT } from "@/theme/typography";
import type { RootNavigation } from "@/navigation/types";
import type { Plan } from "@/lib/plan-types";

/** Wallet providers only — see the honest bank note in the file header. */
type WalletProvider = "libyana" | "madar";

/** The server's mobile-wallet cap copy, verbatim (upgrade/route.ts:65). */
const WALLET_CAP_NOTE = 'المبالغ فوق 99 د.ل تتطلب تحويل بنكي — اختر طريقة الدفع "تحويل بنكي"';

/** Where the bank flow lives — true, and the honest pointer for >99 plans. */
const BANK_ON_WEB_NOTE = "الترقية بالتحويل البنكي متاحة من لوحة التحكم على الويب.";

/** The upgrade promise — web PaymentSection.tsx:46, verbatim. */
const UPGRADE_PROMISE = "بيانات مطعمك الحالية ستبقى كما هي — فقط سيتم ترقية خطتك.";

export function OwnerSubscribeScreen() {
  const navigation = useNavigation<RootNavigation>();
  const insets = useSafeAreaInsets();
  const enterFade = useEnterFade();
  const user = useAuth((s) => s.user);
  // r102-M3 pattern: read the optional capped-restaurant context (the lock
  // sheet passes it when the surface knew it); fall back to the auth row's
  // primary link — the exact /api/auth/me resolution the web page performs.
  const route = useRoute();
  const routeParams = (route.params || {}) as { restaurantId?: number };
  const targetRestaurantId = routeParams.restaurantId ?? user?.restaurantId ?? null;

  const [step, setStep] = useState<"plan" | "pay" | "done">("plan");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [provider, setProvider] = useState<WalletProvider>("libyana");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState(false);
  // The wizard's field grammar (SubscribePaymentScreen): focus halo + the
  // rose error half when validation fired.
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // The SAME ["plans"] query the wizard + pricing screen ride (r126-M5: one
  // cache entry, instant second entry).
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get<Plan[]>("/api/plans"),
    staleTime: 5 * 60_000,
  });

  // Web upgrade-mode filter (PlanSelector.tsx:30): the free plan is not an
  // upgrade target — «مجاني» never carries a higher tier.
  const plans = (data ?? []).filter((p) => Number(p.price) > 0);
  const selectedPlan = plans.find((p) => p.id === selectedId) ?? null;

  const onPay = async () => {
    if (!selectedPlan) return;
    // Same gate as the wizard's payment step (SubscribePaymentScreen):
    // a wallet transfer needs a real sender number (≥8 digits).
    if (phone.replace(/[^\d]/g, "").length < 8) {
      setPhoneError(true);
      toast.error("يُرجى إدخال رقم مرسل صحيح (8 أرقام على الأقل)");
      return;
    }
    setSubmitting(true);
    try {
      // Web PaymentDialog.tsx:145-166 twin — the upgrade endpoint with the
      // plan price as the amount (the route requires amount === plan.price).
      await api.post("/api/subscriptions/upgrade", {
        planId: selectedPlan.id,
        phone: phone.trim(),
        provider,
        amount: Number(selectedPlan.price),
        ...(targetRestaurantId !== null ? { upgradeRestaurantId: targetRestaurantId } : {}),
      });
      setStep("done");
    } catch (e: unknown) {
      // Server Arabic copy surfaces verbatim («الباقة المحددة ليست أعلى من
      // باقتك الحالية»، «لديك طلب دفع معلق»… — the route's own honesty).
      toast.error(getErrorMessage(e, "تعذّر إرسال طلب الترقية"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── step 3: submitted — the wizard's in-screen success twin ──────────────
  if (step === "done") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          {/* The wizard's 56px r-xl success well (SubscribePaymentScreen). */}
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <View style={{ width: 32, height: 32, borderRadius: 9999, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center" }}>
              <Check size={18} color={colors.onAccent} />
            </View>
          </View>
          <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 20, fontWeight: "700", color: colors.ink, textAlign: "center" }}>تم إرسال طلب الترقية</Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            سيتم تأكيد الترقية خلال دقائق عبر تليجرام. عند الموافقة تُفعَّل سقوف خطتك الجديدة تلقائيًا — أعد المحاولة بعد التأكيد.
          </Text>
          <PressableScale
            onPress={() => navigation.goBack()}
            accessibilityLabel="العودة إلى لوحة التحكم"
            style={{ marginTop: 28, backgroundColor: colors.terracotta, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32 }}
          >
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.onAccent }} maxFontSizeMultiplier={1.4}>العودة إلى لوحة التحكم</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  // ── step 1: plan picker — the wizard's plan screen in upgrade clothes ────
  if (step === "plan") {
    if (isPending) {
      /* Shape skeleton — the plan picker's loaded card geometry (the
         wizard's skeleton twin). */
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
          <View style={{ padding: 16 }}>
            <Skeleton width={"50%"} height={20} />
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginTop: 12, marginBottom: 4, borderWidth: 1, borderColor: colors.hairline }}>
                <Skeleton width={"45%"} height={16} />
                <Skeleton width={72} height={24} />
                <Skeleton width={"40%"} height={11} />
              </View>
            ))}
          </View>
        </SafeAreaView>
      );
    }
    if (error) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
          <ErrorState message={getErrorMessage(error, "تعذّر تحميل الباقات")} onRetry={() => { void refetch(); }} />
        </SafeAreaView>
      );
    }
    if (plans.length === 0) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
          <EmptyState title="لا توجد باقات متاحة" />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <Animated.View entering={enterFade} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }}>
            {/* Web upgrade-mode heading, verbatim (PlanSelector.tsx:36). */}
            <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: 16 }}>اختر خطة للترقية إليها</Text>
            {plans.map((p) => (
              <PressableScale
                key={p.id}
                scaleTo={0.99}
                onPress={() => setSelectedId(p.id)}
                accessibilityState={{ selected: selectedId === p.id }}
                style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: selectedId === p.id ? 2 : 1, borderColor: selectedId === p.id ? colors.terracotta : colors.hairline }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: colors.ink }}>{p.nameAr || p.name}</Text>
                    <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 24, fontWeight: "700", color: colors.terracottaPressed, marginTop: 4, fontVariant: METRIC_FONT_VARIANT }}>{formatPrice(p.price)}</Text>
                  </View>
                  {selectedId === p.id ? (
                    <View style={{ width: 24, height: 24, borderRadius: 9999, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center" }}>
                      <Check size={14} color={colors.onAccent} />
                    </View>
                  ) : null}
                </View>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 4 }}>لمدة {p.periodDays} يوم</Text>
              </PressableScale>
            ))}
          </ScrollView>
        </Animated.View>
        <View style={{ position: "absolute", bottom: 16 + insets.bottom, start: 16, end: 16 }}>
          <Button
            title="التالي"
            onPress={() => selectedId && setStep("pay")}
            disabled={!selectedId}
            size="lg"
            className="w-full"
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── step 2: pay-only summary — the web UpgradePlanSummary twin ───────────
  const needsBank = selectedPlan ? Number(selectedPlan.price) > 99 : false;
  const canPay = selectedPlan !== null && !needsBank && targetRestaurantId !== null;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }}>
        {/* The summary card — web PaymentSection.tsx:19-54 twin: plan +
            price + top features + the «تغيير» back link. */}
        <View style={{ backgroundColor: colors.terracottaSoft, borderWidth: 1, borderColor: colors.hairline, borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 17, fontWeight: "700", color: colors.ink }}>{selectedPlan?.nameAr}</Text>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, marginTop: 2, fontVariant: METRIC_FONT_VARIANT }}>
                {selectedPlan ? formatPrice(selectedPlan.price, { suffix: " د.ل/شهر" }) : ""}
              </Text>
            </View>
            <PressableScale onPress={() => setStep("plan")} hitSlop={8} accessibilityLabel="تغيير الخطة" style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.terracotta }} maxFontSizeMultiplier={1.4}>تغيير</Text>
            </PressableScale>
          </View>
          {selectedPlan ? (
            <View style={{ gap: 8, marginTop: 14 }}>
              {selectedPlan.features.slice(0, 5).map((f, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Check size={14} color={colors.terracottaPressed} />
                  <Text style={{ flex: 1, fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.ink }}>{f}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        {/* The upgrade promise — web PaymentSection.tsx:46, verbatim. */}
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 12, lineHeight: 19 }}>
          {UPGRADE_PROMISE}
        </Text>

        {/* Wallet providers — the wizard's pill row, wallets only (the bank
            form lives on the web dashboard; see the honest note below). */}
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, marginTop: 20, marginBottom: 8 }}>طريقة الدفع</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["libyana", "madar"] as const).map((p) => (
            <PressableScale
              key={p}
              onPress={() => setProvider(p)}
              hitSlop={4}
              accessibilityLabel={p === "libyana" ? "ليبيانا" : "مدار"}
              accessibilityState={{ selected: provider === p }}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: provider === p ? colors.terracotta : colors.surface2, alignItems: "center" }}
            >
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: provider === p ? colors.onAccent : colors.muted }} maxFontSizeMultiplier={1.4}>{p === "libyana" ? "ليبيانا" : "مدار"}</Text>
            </PressableScale>
          ))}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6 }}>رقم المرسل</Text>
          <TextInput
            value={phone}
            onChangeText={(v) => { setPhone(v); if (phoneError) setPhoneError(false); }}
            placeholder="09XXXXXXXX"
            placeholderTextColor={colors.muted}
            accessibilityLabel="رقم المرسل"
            keyboardType="phone-pad"
            onFocus={() => setPhoneFocused(true)}
            onBlur={() => setPhoneFocused(false)}
            style={{ minHeight: 44, borderRadius: 14, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, textAlign: "left", fontVariant: METRIC_FONT_VARIANT, ...fieldFocusBorderStyle(phoneFocused, phoneError) }}
          />
        </View>

        {needsBank ? (
          /* The server's own cap copy, verbatim + the honest web pointer —
             a wallet POST above 99 can never succeed (upgrade/route.ts:60),
             so the door says where the real flow lives instead of failing. */
          <View style={{ backgroundColor: colors.yellowBg, borderWidth: 1, borderColor: colors.hairline, borderRadius: 12, padding: 12, marginTop: 16, gap: 6 }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.ink, lineHeight: 18 }}>{WALLET_CAP_NOTE}</Text>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, lineHeight: 18 }}>{BANK_ON_WEB_NOTE}</Text>
          </View>
        ) : (
          /* The wizard's honest receipt note (SubscribePaymentScreen), adapted
             to the upgrade waiting state. */
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: colors.hairline }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, lineHeight: 18 }}>
              بعد إتمام التحويل، أرسل صورة الإيصال للدعم عبر واتساب. سيتم تأكيد ترقيتك خلال دقائق عبر تليجرام.
            </Text>
          </View>
        )}

        {targetRestaurantId === null ? (
          /* Honest blocker: no upgrade target could be resolved (the auth row
             carries no primary link and the surface passed no context) — the
             POST has no upgradeRestaurantId to send. No silent dead button. */
          <View style={{ backgroundColor: colors.roseBg, borderWidth: 1, borderColor: colors.hairline, borderRadius: 12, padding: 12, marginTop: 16 }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.ink, lineHeight: 18 }}>
              تعذّر تحديد المطعم المستهدف للترقية — تواصل مع الدعم لإتمامها.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={{ position: "absolute", bottom: 16 + insets.bottom, start: 16, end: 16 }}>
        {/* Web UpgradePlanSummary CTA pattern, verbatim shape:
            «ادفع الآن (السعر)» — disabled while a blocker stands. */}
        <Button
          title={selectedPlan ? `ادفع الآن (${formatPrice(selectedPlan.price)})` : "ادفع الآن"}
          onPress={() => { void onPay(); }}
          loading={submitting}
          disabled={!canPay}
          size="lg"
          className="w-full"
        />
      </View>
    </SafeAreaView>
  );
}
