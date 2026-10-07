import { useState } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogIn, MessageCircle } from "lucide-react-native";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input, PasswordInput, Label } from "@/components/ui/Input";
import { useAuth } from "@/store/auth";
import { toast } from "@/app/providers";

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
    else toast.error("فشل تسجيل الدخول", result.error);
  };

  const openSupport = () => {
    const digits = SUPPORT_WHATSAPP.replace(/[^\d]/g, "");
    void Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent("مرحبًا، أحتاج مساعدة في استرجاع كلمة المرور")}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070B16" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: "#E9B44C" }}>
              <LogIn size={28} color="#05070F" />
            </View>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 24, fontWeight: "700", color: "#F2EFE6" }}>الربط الذكي</Text>
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 14, color: "#8E97B8", marginTop: 4 }}>منيو رقمي للمطاعم والمقاهي</Text>
          </View>

          <View className="mb-6">
            <Label>اسم المستخدم</Label>
            <Input value={username} onChangeText={setUsername} placeholder="اسم المستخدم" autoCapitalize="none" autoCorrect={false} returnKeyType="next" error={Boolean(errors.username)} />
            {errors.username ? <Text style={{ color: "#F0938F", fontFamily: "IBM Plex Sans Arabic", fontSize: 12, marginTop: 4 }}>{errors.username}</Text> : null}
          </View>

          <View className="mb-6">
            <Label>كلمة المرور</Label>
            <PasswordInput value={password} onChangeText={setPassword} placeholder="كلمة المرور" returnKeyType="done" onSubmitEditing={onSubmit} error={Boolean(errors.password)} />
            {errors.password ? <Text style={{ color: "#F0938F", fontFamily: "IBM Plex Sans Arabic", fontSize: 12, marginTop: 4 }}>{errors.password}</Text> : null}
          </View>

          <Button title={submitting ? "جارٍ الدخول..." : "تسجيل الدخول"} loading={submitting} onPress={onSubmit} className="w-full" />

          <Pressable onPress={openSupport} className="mt-6 flex-row items-center justify-center gap-2">
            <MessageCircle size={16} color="#25d366" />
            <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: "#8E97B8" }}>نسيت كلمة المرور؟ تواصل مع الدعم</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
