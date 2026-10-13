import { useState } from "react";
import { View, TextInput, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, StackActions } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react-native";

import { api } from "@/services/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, EmptyState } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { Text } from "@/components/ui/Text";
import { toast } from "@/app/providers";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAuth } from "@/store/auth";
import { PressableScale } from "@/components/motion/PressableScale";
import { useEnterFade } from "@/components/motion/useEnterFade";
import Animated from "react-native-reanimated";
import type { RootNavigation } from "@/navigation/types";
import type { Plan } from "@/lib/plan-types";
import { colors } from "@/theme/colors";
import { METRIC_FONT_VARIANT } from "@/theme/typography";
import { fieldFocusBorderStyle } from "@/components/ui/Input";

export function SubscribePlanScreen() {
  const navigation = useNavigation<RootNavigation>();
  // r126-M2 (A6 P1-1): the trapped-owner escape. UNPAID/EXPIRED/REJECTED
  // owners land here from every relaunch with NO logout and no back — a
  // dead end for anyone who decides not to pay (or whose payment was
  // rejected). Product policy (PRODUCT.md): the dashboard is gated until an
  // admin approves payment, so "later" grace is NOT a product concept — the
  // honest escapes are (a) logout back to the public app, and (b) a status
  // refresh that immediately unlocks the dashboard once admin approves
  // (no app relaunch needed).
  const logout = useAuth((s) => s.logout);
  const refreshStatus = useAuth((s) => s.bootstrap);
  const insets = useSafeAreaInsets();
  // r126-M4: content fade-in (160ms fast rung).
  const enterFade = useEnterFade();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // r126-M5: the SAME ["plans"] query PricingScreen reads — one cache entry,
  // instant second entry for owners who came through the pricing page.
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get<Plan[]>("/api/plans"),
    staleTime: 5 * 60_000,
  });
  const plans = data ?? [];
  const loadError = error ? getErrorMessage(error, "تعذّر تحميل الباقات") : null;
  const loading = isPending;

  if (loading) {
    /* r133-F3 (A4 §3, the F2b handoff): the plan picker's first paint is a
       SHAPE skeleton (r131 fleet ruling "loading = shape skeletons") —
       heading + plan-card rows (name line + the 24px price metric + period
       line on surface r-12 hairline cards = the loaded card geometry). Was
       a centered spinner: 6 of the app's 8 loading states were spinners. */
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

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <ErrorState message={loadError} onRetry={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  // r132-F2b (A4 S6b): the plans-empty branch — PricingScreen has one, this
  // screen didn't: a trapped UNPAID owner against an empty plans API saw a
  // bare screen with a dead «التالي». Same EmptyState family + copy as the
  // pricing twin.
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
        <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: 16 }}>اختر باقتك</Text>
        {plans.map((p) => (
          // r130 W2-4: plan CARD → --state-card-pressed-scale 0.99
          // (tokens.css:248); the metric price rides tabular lining numerals
          // (--type-metric-feature-settings 'tnum'/'lnum', tokens.css:334).
          // r131-F10 (fix 2 — fleet price ruling): plan prices unify at 24px
          // gold tnum on BOTH mobile pricing surfaces (was 20px here / 28px
          // on PricingScreen — the same datum rendered two ways).
          <PressableScale key={p.id} scaleTo={0.99} onPress={() => setSelectedId(p.id)} accessibilityState={{ selected: selectedId === p.id }} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: selectedId === p.id ? 2 : 1, borderColor: selectedId === p.id ? colors.terracotta : colors.hairline }}>
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
      {/* r126 (A6 P2-11): inset-aware sticky CTA (was bottom:16 — overlapped
          the Android gesture bar / iOS home indicator).
          r133-F3 (A4 N2): logical start/end replaces the inert physical
          left/right pair — the r131 sweep's standard spelling. */}
      <View style={{ position: "absolute", bottom: 16 + insets.bottom, start: 16, end: 16 }}>
        <Button title="التالي" onPress={() => selectedId && navigation.navigate("SubscribeMenu", { planId: selectedId })} disabled={!selectedId} size="lg" className="w-full" />
        {/* r126-M2: escape hatch — logout (rose) + refresh status (muted).
            r131-F10 (A2 P1-4 + fix 6): both links ride PressableScale — the
            hand-rolled `pressed ? 0.7` opacity register is exactly what the
            r130 W2-4 header killed; scale 0.97@80ms replaces it. */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, marginTop: 12 }}>
          <PressableScale
            onPress={() => { void refreshStatus(); }}
            accessibilityLabel="تحديث حالة الاشتراك"
            hitSlop={8}
            style={{ paddingVertical: 8, paddingHorizontal: 8 }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.muted }} maxFontSizeMultiplier={1.4}>تحديث حالة الاشتراك</Text>
          </PressableScale>
          <PressableScale
            onPress={() => { void logout(); }}
            accessibilityLabel="تسجيل الخروج"
            hitSlop={8}
            style={{ paddingVertical: 8, paddingHorizontal: 8 }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.rose }} maxFontSizeMultiplier={1.4}>تسجيل الخروج</Text>
          </PressableScale>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function SubscribeMenuScreen() {
  const navigation = useNavigation<RootNavigation>();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  // r102-M3: the plan chosen on the previous screen — persisted with the
  // pending-restaurant payload so the payment step can read it after reload.
  const { planId } = (route.params || {}) as { planId: number };
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onNext = async () => {
    if (!name.trim() || !slug.trim()) { toast.error("الاسم والـ slug مطلوبان"); return; }
    setSubmitting(true);
    try {
      await api.post("/api/subscriptions/validate", { tempUsername: slug, tempRestaurants: [{ name, slug }] }, { skipAuth: true });
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.setItem("subscribe_pending", JSON.stringify({ name, slug, phone, whatsapp, planId }));
      navigation.navigate("SubscribePayment", { planId });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "الاسم أو الـ slug مستخدم بالفعل"));
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      {/* r132-F2b (A4 S5): paddingBottom 96 → 140 + insets.bottom (the
          sibling formula at the plan screen) — the sticky CTA zone is
          16 + insets.bottom + 56 ≈ 106px on a 34px-inset iPhone, so 96
          left the last ~10px of the واتساب field under the CTA. */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }}>
        <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: 16 }}>بيانات مطعمك</Text>
        <LabelAndInput label="اسم المطعم" value={name} onChange={setName} placeholder="مطعم البرج" />
        <LabelAndInput label="الرابط (slug)" value={slug} onChange={(v) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="al-borg" />
        <LabelAndInput label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="09XXXXXXXX" keyboardType="phone-pad" />
        <LabelAndInput label="واتساب" value={whatsapp} onChange={setWhatsapp} placeholder="09XXXXXXXX" keyboardType="phone-pad" />
      </ScrollView>
      {/* r133-F3 (A4 N2): logical start/end — the r131 sweep's standard spelling. */}
      <View style={{ position: "absolute", bottom: 16 + insets.bottom, start: 16, end: 16 }}>
        <Button title={submitting ? "جارٍ التحقق…" : "التالي"} onPress={onNext} loading={submitting} size="lg" className="w-full" />
      </View>
    </SafeAreaView>
  );
}

export function SubscribePaymentScreen() {
  const navigation = useNavigation<RootNavigation>();
  const insets = useSafeAreaInsets();
  const [provider, setProvider] = useState<"libyana" | "madar" | "bank">("libyana");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // r132-F2b (A4 S6a): field-level error halos — the money form had ZERO
  // client-side validation; phone:"" / amount:Number("") → 0 were POSTed
  // and the owner discovered the problem as a generic server-400 toast.
  const [fieldErrors, setFieldErrors] = useState<{ phone?: boolean; amount?: boolean }>({});
  // r118-B3 (A6 P2-1): in-screen success state — see onPay.
  const [submitted, setSubmitted] = useState(false);

  const onPay = async () => {
    /* r132-F2b (A4 S6a, SO A6 "zero field validation" ruling twin): gate
       the POST on required sender phone (≥8 digits) + amount > 0, with the
       rose fieldFocusBorderStyle(_, error) halo already in the grammar. */
    const amountNum = Number(amount);
    const nextErrors: { phone?: boolean; amount?: boolean } = {};
    if (phone.replace(/[^\d]/g, "").length < 8) nextErrors.phone = true;
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) nextErrors.amount = true;
    if (nextErrors.phone || nextErrors.amount) {
      setFieldErrors(nextErrors);
      toast.error(nextErrors.phone ? "يُرجى إدخال رقم مرسل صحيح (8 أرقام على الأقل)" : "يُرجى إدخال مبلغ صحيح للتحويل");
      return;
    }
    setSubmitting(true);
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      const pending = JSON.parse((await AsyncStorage.getItem("subscribe_pending")) || "{}");
      // r102-M3: planId rides the payload — the server zod schema has required
      // it all along; the old POST omitted it entirely (defaulting server-side)
      // and the user's chosen plan was silently discarded.
      await api.post("/api/subscriptions", {
        planId: typeof pending.planId === "number" ? pending.planId : undefined,
        provider, phone, amount: Number(amount),
        tempRestaurants: [{ name: pending.name, slug: pending.slug }], tempUsername: pending.slug,
      });
      toast.success("تم إرسال طلب الدفع — سيتم تأكيده خلال دقائق");
      // r118-B3 (A6 P2-1): the old navigation.getParent()?.getParent()?.navigate("Landing")
      // was a silent no-op — AuthStack is the ROOT navigator of its container, so
      // both getParent() hops return undefined and the owner stayed stranded on
      // the payment form (a re-tap then collided with the server's
      // "لديك طلب دفع معلق" 400). The intended "Landing" screen lives in the
      // PUBLIC container, and the owner dashboard stays gated (user.subscriptionStatus
      // only flips to PAID when an admin approves), so the sensible landing is an
      // in-screen success state — mirroring the web PaymentDialog's post-submit
      // step — with an explicit way back to the top of the wizard.
      setSubmitted(true);
    } catch (e: unknown) {
      // r131-F10 (fix 8): fleet error verb — تعذّر (was فشل).
      toast.error(getErrorMessage(e, "تعذّر إرسال الطلب"));
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          {/* r131-F10 (fix 3): the submitted well converges on the canonical
              56px r-xl state tile (was 72px circle) — same grammar as the
              OrderConfirmed success well; the nested gold check keeps this
              screen's identity at 32/18. */}
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <View style={{ width: 32, height: 32, borderRadius: 9999, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center" }}>
              <Check size={18} color={colors.onAccent} />
            </View>
          </View>
          <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 20, fontWeight: "700", color: colors.ink, textAlign: "center" }}>تم إرسال طلب الدفع</Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            سيتم تأكيد اشتراكك خلال دقائق عبر تليجرام. عند الموافقة تُفتح لوحة التحكم تلقائيًا عند إعادة فتح التطبيق.
          </Text>
          {/* r131-F10 (A2 P1-4 + fix 6): PressableScale — the hand-rolled
              `pressed ? 0.9` register joins the 0.97@80ms ladder. */}
          <PressableScale
            onPress={() => navigation.dispatch(StackActions.popToTop())}
            accessibilityLabel="العودة للبداية"
            style={{ marginTop: 28, backgroundColor: colors.terracotta, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32 }}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.onAccent }} maxFontSizeMultiplier={1.4}>العودة للبداية</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top"]}>
      {/* r132-F2b (A4 S5): same 140 + insets.bottom fix as the details step —
          the receipt-note card rode under the CTA on notched devices. */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }}>
        <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: 16 }}>طريقة الدفع</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {(["libyana", "madar", "bank"] as const).map((p) => (
            // r131-F10 (A2 P1-4 + fix 5): payment providers ride PressableScale
            // (was a silent raw Pressable) and expose the selected state to
            // TalkBack/VoiceOver (was missing entirely on this control).
            <PressableScale key={p} onPress={() => setProvider(p)} hitSlop={4} accessibilityLabel={p === "libyana" ? "ليبيانا" : p === "madar" ? "مدار" : "بنك"} accessibilityState={{ selected: provider === p }} style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: provider === p ? colors.terracotta : colors.surface2, alignItems: "center" }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: provider === p ? colors.onAccent : colors.muted }} maxFontSizeMultiplier={1.4}>{p === "libyana" ? "ليبيانا" : p === "madar" ? "مدار" : "بنك"}</Text>
            </PressableScale>
          ))}
        </View>
        <LabelAndInput label="رقم المرسل" value={phone} error={fieldErrors.phone} onChange={(v) => { setPhone(v); if (fieldErrors.phone) setFieldErrors((e) => ({ ...e, phone: false })); }} placeholder="09XXXXXXXX" keyboardType="phone-pad" />
        <LabelAndInput label="المبلغ" value={amount} error={fieldErrors.amount} onChange={(v) => { setAmount(v); if (fieldErrors.amount) setFieldErrors((e) => ({ ...e, amount: false })); }} placeholder="50" keyboardType="numeric" />
        {/* r126-M3: the old copy promised receipt upload «من شاشة الإعدادات
            لاحقًا» — that feature does not exist (the expo-image-picker
            plugin + camera permissions were removed with it). Honest copy:
            transfer, then send the receipt to support; Telegram confirms. */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: colors.hairline }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, lineHeight: 18 }}>
            بعد إتمام التحويل، أرسل صورة الإيصال للدعم عبر واتساب. سيتم تأكيد اشتراكك خلال دقائق عبر تليجرام.
          </Text>
        </View>
      </ScrollView>
      {/* r133-F3 (A4 N2): logical start/end — the r131 sweep's standard spelling. */}
      <View style={{ position: "absolute", bottom: 16 + insets.bottom, start: 16, end: 16 }}>
        <Button title={submitting ? "جارٍ الإرسال…" : "إرسال طلب الدفع"} onPress={onPay} loading={submitting} size="lg" className="w-full" />
      </View>
    </SafeAreaView>
  );
}

function LabelAndInput({ label, value, onChange, placeholder, keyboardType, error }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: "default" | "phone-pad" | "numeric"; error?: boolean }) {
  // r131-F10 (fix 7): the wizard's shared field rides the app-wide focus
  // halo (fieldFocusBorderStyle) — these inputs had no focus treatment.
  // r132-F2b (A4 S6a): the error half of the grammar lights up too (rose
  // resting border while the field carries a validation error).
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 4 }}>{label}</Text>
      {/* r126-M6: minHeight (was height: 44) + paddingVertical — text grows
          with system font scale instead of clipping at fontScale ≥1.3. */}
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType || "default"} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={{ minHeight: 44, borderRadius: 8, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontFamily: "IBM Plex Sans Arabic", fontSize: 14, ...fieldFocusBorderStyle(focused, error) }} />
    </View>
  );
}
