import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Check } from "lucide-react-native";

import { api } from "@/services/api/client";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui";
import { toast } from "@/app/providers";
import { formatPrice } from "@/lib/format";
import type { Plan } from "@/lib/plan-types";

type Nav = any;

export function SubscribePlanScreen() {
  const navigation = useNavigation<Nav>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const list = await api.get<Plan[]>("/api/plans");
        setPlans(list ?? []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Spinner /></View>
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
        <Button title="التالي" onPress={() => selectedId && navigation.navigate("SubscribeMenu")} disabled={!selectedId} size="lg" className="w-full" />
      </View>
    </SafeAreaView>
  );
}

export function SubscribeMenuScreen() {
  const navigation = useNavigation<Nav>();
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
      await AsyncStorage.setItem("subscribe_pending", JSON.stringify({ name, slug, phone, whatsapp }));
      navigation.navigate("SubscribePayment", { planId: 1 });
    } catch (e: any) {
      toast.error(e?.message || "الاسم أو الـ slug مستخدم بالفعل");
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
  const navigation = useNavigation<Nav>();
  const [provider, setProvider] = useState<"libyana" | "madar" | "bank">("libyana");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onPay = async () => {
    setSubmitting(true);
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      const pending = JSON.parse((await AsyncStorage.getItem("subscribe_pending")) || "{}");
      await api.post("/api/subscriptions", {
        provider, phone, amount: Number(amount),
        tempRestaurants: [{ name: pending.name, slug: pending.slug }], tempUsername: pending.slug,
      });
      toast.success("تم إرسال طلب الدفع — سيتم تأكيده خلال دقائق");
      navigation.getParent()?.getParent()?.navigate("Landing");
    } catch (e: any) {
      toast.error(e?.message || "فشل إرسال الطلب");
    } finally { setSubmitting(false); }
  };

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
