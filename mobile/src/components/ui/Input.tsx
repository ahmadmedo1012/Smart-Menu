import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Pressable } from "react-native";
import { cn } from "@/lib/utils";

import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";

export interface InputProps extends TextInputProps { error?: boolean; }

export function Input({ className, error, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        // r126-M6: minHeight (was h-12) — fixed height clipped input text at
        // fontScale ≥1.3; py-3 keeps the ≥48px resting box with room to grow.
        "min-h-12 rounded-md border border-border bg-input px-4 py-3 text-base text-foreground",
        "font-sans placeholder:text-muted-foreground focus:border-ring",
        error && "border-destructive", className,
      )}
      placeholderTextColor={colors.muted} {...props}
    />
  );
}

export function PasswordInput({ className, error, ...props }: InputProps) {
  const [show, setShow] = useState(false);
  return (
    <View className="relative">
      <TextInput
        className={cn(
          // r130 W2-4 (RTL): pr-12 → pe-12 — the eye toggle sits at `end-2`,
          // so the text inset must be logical too (physical right padding
          // starved the toggle's side in this forced-RTL app).
          "min-h-12 rounded-md border border-border bg-input px-4 py-3 pe-12 text-base text-foreground",
          "font-sans placeholder:text-muted-foreground focus:border-ring",
          error && "border-destructive", className,
        )}
        placeholderTextColor={colors.muted} secureTextEntry={!show} {...props}
      />
      <Pressable onPress={() => setShow((v) => !v)} className="absolute end-2 top-0 bottom-0 w-10 items-center justify-center" accessibilityLabel={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
        {show ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
      </Pressable>
    </View>
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-sm font-medium text-foreground mb-2 font-sans", className)}>{children}</Text>;
}
