import { useState } from "react";
import { View, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, StackActions } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react-native";

import { api } from "@/services/api/client";
import { Button } from "@/components/ui/Button";
import { Spinner, ErrorState } from "@/components/ui";
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
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <ErrorState message={loadError} onRetry={() => { void refetch(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <Animated.View entering={enterFade} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 20, fontWeight: "700", color: colors.sand, marginBottom: 16 }}>اختر باقتك</Text>
        {plans.map((p) => (
          // r130 W2-4: plan CARD → --state-card-pressed-scale 0.99
          // (tokens.css:248); the metric price rides tabular lining numerals
          // (--type-metric-feature-settings 'tnum'/'lnum', tokens.css:334).
          <PressableScale key={p.id} scaleTo={0.99} onPress={() => setSelectedId(p.id)} accessibilityState={{ selected: selectedId === p.id }} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: selectedId === p.id ? 2 : 1, borderColor: selectedId === p.id ? colors.gold : colors.hairline }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 16, fontWeight: "700", color: colors.sand }}>{p.nameAr || p.name}</Text>
                <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 20, fontWeight: "700", color: colors.gold, marginTop: 4, fontVariant: METRIC_FONT_VARIANT }}>{formatPrice(p.price)}</Text>
              </View>
              {selectedId === p.id ? (
                <View style={{ width: 24, height: 24, borderRadius: 9999, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}>
                  <Check size={14} color={colors.void} />
                </View>
              ) : null}
            </View>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 11, color: colors.muted, marginTop: 4 }}>لمدة {p.periodDays} يوم</Text>
          </PressableScale>
        ))}
      </ScrollView>
      </Animated.View>
      {/* r126 (A6 P2-11): inset-aware sticky CTA (was bottom:16 — overlapped
          the Android gesture bar / iOS home indicator). */}
      <View style={{ position: "absolute", bottom: 16 + insets.bottom, left: 16, right: 16 }}>
        <Button title="التالي" onPress={() => selectedId && navigation.navigate("SubscribeMenu", { planId: selectedId })} disabled={!selectedId} size="lg" className="w-full" />
        {/* r126-M2: escape hatch — logout (rose) + refresh status (muted). */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, marginTop: 12 }}>
          <Pressable
            onPress={() => { void refreshStatus(); }}
            accessibilityRole="button"
            accessibilityLabel="تحديث حالة الاشتراك"
            hitSlop={8}
            style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 8, opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.muted }} maxFontSizeMultiplier={1.4}>تحديث حالة الاشتراك</Text>
          </Pressable>
          <Pressable
            onPress={() => { void logout(); }}
            accessibilityRole="button"
            accessibilityLabel="تسجيل الخروج"
            hitSlop={8}
            style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 8, opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.rose }} maxFontSizeMultiplier={1.4}>تسجيل الخروج</Text>
          </Pressable>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 20, fontWeight: "700", color: colors.sand, marginBottom: 16 }}>بيانات مطعمك</Text>
        <LabelAndInput label="اسم المطعم" value={name} onChange={setName} placeholder="مطعم البرج" />
        <LabelAndInput label="الرابط (slug)" value={slug} onChange={(v) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="al-borg" />
        <LabelAndInput label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="09xxxxxxxx" keyboardType="phone-pad" />
        <LabelAndInput label="واتساب" value={whatsapp} onChange={setWhatsapp} placeholder="09xxxxxxxx" keyboardType="phone-pad" />
      </ScrollView>
      <View style={{ position: "absolute", bottom: 16 + insets.bottom, left: 16, right: 16 }}>
        <Button title={submitting ? "جارٍ التحقق..." : "التالي"} onPress={onNext} loading={submitting} size="lg" className="w-full" />
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
  // r118-B3 (A6 P2-1): in-screen success state — see onPay.
  const [submitted, setSubmitted] = useState(false);

  const onPay = async () => {
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
      toast.error(getErrorMessage(e, "فشل إرسال الطلب"));
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: 72, height: 72, borderRadius: 9999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <View style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}>
              <Check size={20} color={colors.void} />
            </View>
          </View>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 20, fontWeight: "700", color: colors.sand, textAlign: "center" }}>تم إرسال طلب الدفع</Text>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            سيتم تأكيد اشتراكك خلال دقائق عبر تيليجرام. عند الموافقة تُفتح لوحة التحكم تلقائيًا عند إعادة فتح التطبيق.
          </Text>
          <Pressable
            onPress={() => navigation.dispatch(StackActions.popToTop())}
            accessibilityRole="button"
            accessibilityLabel="العودة للبداية"
            style={({ pressed }) => ({ marginTop: 28, backgroundColor: colors.gold, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32, opacity: pressed ? 0.9 : 1 })}>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, fontWeight: "700", color: colors.void }} maxFontSizeMultiplier={1.4}>العودة للبداية</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 20, fontWeight: "700", color: colors.sand, marginBottom: 16 }}>طريقة الدفع</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {(["libyana", "madar", "bank"] as const).map((p) => (
            <Pressable key={p} onPress={() => setProvider(p)} style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: provider === p ? colors.gold : colors.surface2, alignItems: "center" }}>
              <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: provider === p ? colors.void : colors.muted }} maxFontSizeMultiplier={1.4}>{p === "libyana" ? "ليبيانا" : p === "madar" ? "مدار" : "بنك"}</Text>
            </Pressable>
          ))}
        </View>
        <LabelAndInput label="رقم المرسل" value={phone} onChange={setPhone} placeholder="09xxxxxxxx" keyboardType="phone-pad" />
        <LabelAndInput label="المبلغ" value={amount} onChange={setAmount} placeholder="50" keyboardType="numeric" />
        {/* r126-M3: the old copy promised receipt upload «من شاشة الإعدادات
            لاحقًا» — that feature does not exist (the expo-image-picker
            plugin + camera permissions were removed with it). Honest copy:
            transfer, then send the receipt to support; Telegram confirms. */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: colors.hairline }}>
          <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, color: colors.muted, lineHeight: 18 }}>
            بعد إتمام التحويل، أرسل صورة الإيصال للدعم عبر واتساب. سيتم تأكيد اشتراكك خلال دقائق عبر تيليجرام.
          </Text>
        </View>
      </ScrollView>
      <View style={{ position: "absolute", bottom: 16 + insets.bottom, left: 16, right: 16 }}>
        <Button title={submitting ? "جارٍ الإرسال..." : "إرسال طلب الدفع"} onPress={onPay} loading={submitting} size="lg" className="w-full" />
      </View>
    </SafeAreaView>
  );
}

function LabelAndInput({ label, value, onChange, placeholder, keyboardType }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: "default" | "phone-pad" | "numeric" }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, fontWeight: "600", color: colors.sand, marginBottom: 4 }}>{label}</Text>
      {/* r126-M6: minHeight (was height: 44) + paddingVertical — text grows
          with system font scale instead of clipping at fontScale ≥1.3. */}
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType={keyboardType || "default"} style={{ minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.night, paddingHorizontal: 12, paddingVertical: 10, color: colors.sand, fontFamily: "IBM Plex Sans Arabic", fontSize: 14 }} />
    </View>
  );
}
