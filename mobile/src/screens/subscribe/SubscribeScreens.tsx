import { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, StackActions } from "@react-navigation/native";
import { Check } from "lucide-react-native";

import { api } from "@/services/api/client";
import { Button } from "@/components/ui/Button";
import { Spinner, ErrorState } from "@/components/ui";
import { toast } from "@/app/providers";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/get-error-message";
import type { RootNavigation } from "@/navigation/types";
import type { Plan } from "@/lib/plan-types";

export function SubscribePlanScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // r118-B3 (A6 P2-2): the load was a fire-and-forget effect with `catch {}` —
  // a network failure rendered an EMPTY plan list (dead "التالي" button, no
  // retry, no message). Hoisted into a load callback (the OwnerQrScreen
  // pattern) so the ErrorState retry button actually refetches.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.get<Plan[]>("/api/plans");
      setPlans(list ?? []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "تعذّر تحميل الباقات"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
        <ErrorState message={error} onRetry={load} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 20, fontWeight: "700", color: "#ebe7e2", marginBottom: 16 }}>اختر باقتك</Text>
        {plans.map((p) => (
          <Pressable key={p.id} onPress={() => setSelectedId(p.id)} style={{ backgroundColor: "#070503", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: selectedId === p.id ? 2 : 1, borderColor: selectedId === p.id ? "#bc4700" : "#1f1813" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontFamily: "ReadexPro", fontSize: 16, fontWeight: "700", color: "#ebe7e2" }}>{p.nameAr || p.name}</Text>
                <Text style={{ fontFamily: "ReadexPro", fontSize: 20, fontWeight: "700", color: "#bc4700", marginTop: 4 }}>{formatPrice(p.price)}</Text>
              </View>
              {selectedId === p.id ? (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#bc4700", alignItems: "center", justifyContent: "center" }}>
                  <Check size={14} color="#fff" />
                </View>
              ) : null}
            </View>
            <Text style={{ fontFamily: "Cairo", fontSize: 11, color: "#9c948a", marginTop: 4 }}>لمدة {p.periodDays} يوم</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
        <Button title="التالي" onPress={() => selectedId && navigation.navigate("SubscribeMenu", { planId: selectedId })} disabled={!selectedId} size="lg" className="w-full" />
      </View>
    </SafeAreaView>
  );
}

export function SubscribeMenuScreen() {
  const navigation = useNavigation<RootNavigation>();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 20, fontWeight: "700", color: "#ebe7e2", marginBottom: 16 }}>بيانات مطعمك</Text>
        <LabelAndInput label="اسم المطعم" value={name} onChange={setName} placeholder="مطعم البرج" />
        <LabelAndInput label="الرابط (slug)" value={slug} onChange={(v) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="al-borg" />
        <LabelAndInput label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="09xxxxxxxx" keyboardType="phone-pad" />
        <LabelAndInput label="واتساب" value={whatsapp} onChange={setWhatsapp} placeholder="09xxxxxxxx" keyboardType="phone-pad" />
      </ScrollView>
      <View style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
        <Button title={submitting ? "جارٍ التحقق..." : "التالي"} onPress={onNext} loading={submitting} size="lg" className="w-full" />
      </View>
    </SafeAreaView>
  );
}

export function SubscribePaymentScreen() {
  const navigation = useNavigation<RootNavigation>();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#070503", borderWidth: 1, borderColor: "#1f1813", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#bc4700", alignItems: "center", justifyContent: "center" }}>
              <Check size={20} color="#fff" />
            </View>
          </View>
          <Text style={{ fontFamily: "ReadexPro", fontSize: 20, fontWeight: "700", color: "#ebe7e2", textAlign: "center" }}>تم إرسال طلب الدفع</Text>
          <Text style={{ fontFamily: "Cairo", fontSize: 13, color: "#9c948a", textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            سيتم تأكيد اشتراكك خلال دقائق عبر تيليجرام. عند الموافقة تُفتح لوحة التحكم تلقائيًا عند إعادة فتح التطبيق.
          </Text>
          <Pressable
            onPress={() => navigation.dispatch(StackActions.popToTop())}
            accessibilityLabel="العودة للبداية"
            style={({ pressed }) => ({ marginTop: 28, backgroundColor: "#bc4700", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32, opacity: pressed ? 0.9 : 1 })}>
            <Text style={{ fontFamily: "Cairo", fontSize: 14, fontWeight: "700", color: "#fff" }}>العودة للبداية</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 20, fontWeight: "700", color: "#ebe7e2", marginBottom: 16 }}>طريقة الدفع</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {(["libyana", "madar", "bank"] as const).map((p) => (
            <Pressable key={p} onPress={() => setProvider(p)} style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: provider === p ? "#bc4700" : "#1f1813", alignItems: "center" }}>
              <Text style={{ fontFamily: "Cairo", fontSize: 12, fontWeight: "600", color: provider === p ? "#fff" : "#9c948a" }}>{p === "libyana" ? "ليبيانا" : p === "madar" ? "مدار" : "بنك"}</Text>
            </Pressable>
          ))}
        </View>
        <LabelAndInput label="رقم المرسل" value={phone} onChange={setPhone} placeholder="09xxxxxxxx" keyboardType="phone-pad" />
        <LabelAndInput label="المبلغ" value={amount} onChange={setAmount} placeholder="50" keyboardType="numeric" />
        <View style={{ backgroundColor: "#070503", borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: "#1f1813" }}>
          <Text style={{ fontFamily: "Cairo", fontSize: 12, color: "#9c948a", lineHeight: 18 }}>
            بعد إتمام التحويل، ارفع صورة الإيصال من شاشة الإعدادات لاحقًا. سيتم تأكيد اشتراكك خلال دقائق عبر تيليجرام.
          </Text>
        </View>
      </ScrollView>
      <View style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
        <Button title={submitting ? "جارٍ الإرسال..." : "إرسال طلب الدفع"} onPress={onPay} loading={submitting} size="lg" className="w-full" />
      </View>
    </SafeAreaView>
  );
}

function LabelAndInput({ label, value, onChange, placeholder, keyboardType }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: "default" | "phone-pad" | "numeric" }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontFamily: "Cairo", fontSize: 13, fontWeight: "600", color: "#ebe7e2", marginBottom: 4 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9c948a" keyboardType={keyboardType || "default"} style={{ height: 44, borderRadius: 8, borderWidth: 1, borderColor: "#1f1813", backgroundColor: "#010000", paddingHorizontal: 12, color: "#ebe7e2", fontFamily: "Cairo", fontSize: 14 }} />
    </View>
  );
}
