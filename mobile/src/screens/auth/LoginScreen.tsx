import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogIn, MessageCircle } from "lucide-react-native";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input, PasswordInput, Label } from "@/components/ui/Input";
import { PressableScale } from "@/components/motion/PressableScale";
import { useAuth } from "@/store/auth";
import { toast } from "@/app/providers";

import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";
// r134-W2 (#15): the support link rides the shared normalizer + builder —
// the hand-rolled [^\d] strip was the pre-r133-A12-M1 body (Eastern digits
// ٠٩١٢… stripped to "" → wa.me/ dead link; same bug class the lib fold fixes).
import { buildWhatsAppShareUrl, normalizeWaNumber } from "@/lib/whatsapp";

const loginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب").max(100),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const SUPPORT_WHATSAPP = (process.env.EXPO_PUBLIC_WHATSAPP_NUMBER as string | undefined) ?? "+218910089975";

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const login = useAuth((s) => s.login);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const parsed = loginSchema.safeParse({ username: username.trim(), password });
    if (!parsed.success) {
      const fe: { username?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "username") fe.username = issue.message;
        if (issue.path[0] === "password") fe.password = issue.message;
      }
      setErrors(fe); return;
    }
    setErrors({}); setSubmitting(true);
    const result = await login(parsed.data.username, parsed.data.password);
    setSubmitting(false);
    if (result.ok) toast.success("تم تسجيل الدخول بنجاح");
    // r131-F10 (fix 8): fleet error verb — تعذّر (was فشل).
    else toast.error("تعذّر تسجيل الدخول", result.error);
  };

  const openSupport = () => {
    const wa = normalizeWaNumber(SUPPORT_WHATSAPP);
    void Linking.openURL(buildWhatsAppShareUrl("مرحبًا، أحتاج مساعدة في استرجاع كلمة المرور", wa));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: colors.terracotta }}>
              <LogIn size={28} color={colors.onAccent} />
            </View>
            <Text style={{ fontFamily: "Baloo Bhaijaan 2", fontSize: 24, fontWeight: "700", color: colors.ink }}>الربط الذكي</Text>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, color: colors.muted, marginTop: 4 }}>منيو رقمي للمطاعم والمقاهي</Text>
          </View>

          <View className="mb-6">
            <Label>اسم المستخدم</Label>
            <Input value={username} onChangeText={setUsername} placeholder="اسم المستخدم" autoCapitalize="none" autoCorrect={false} returnKeyType="next" error={Boolean(errors.username)} />
            {errors.username ? <Text style={{ color: colors.rose, fontFamily: "IBM Plex Sans Arabic", fontSize: 12, marginTop: 4 }}>{errors.username}</Text> : null}
          </View>

          <View className="mb-6">
            <Label>كلمة المرور</Label>
            <PasswordInput value={password} onChangeText={setPassword} placeholder="كلمة المرور" returnKeyType="done" onSubmitEditing={onSubmit} error={Boolean(errors.password)} />
            {errors.password ? <Text style={{ color: colors.rose, fontFamily: "IBM Plex Sans Arabic", fontSize: 12, marginTop: 4 }}>{errors.password}</Text> : null}
          </View>

          {/* r133-F3 (A9/R6): «…» single-char ellipsis (was ASCII "..."). */}
          <Button title={submitting ? "جارٍ الدخول…" : "تسجيل الدخول"} loading={submitting} onPress={onSubmit} className="w-full" />

          {/* r131-F10 (A2 P1-4 + fix 5): the support link rides PressableScale
              (0.97@80ms — was a silent raw Pressable) with a 44px+ effective
              target (py-8 + hitSlop 12) and an explicit a11y label. */}
          <PressableScale
            onPress={openSupport}
            hitSlop={12}
            accessibilityLabel="نسيت كلمة المرور؟ تواصل مع الدعم عبر واتساب"
            style={{ marginTop: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 }}>
            <MessageCircle size={16} color={colors.whatsapp} />
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted }}>نسيت كلمة المرور؟ تواصل مع الدعم</Text>
          </PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
