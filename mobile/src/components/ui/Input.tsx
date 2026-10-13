import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { cn } from "@/lib/utils";

import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { colors } from "@/theme/colors";

export interface InputProps extends TextInputProps { error?: boolean; }

/**
 * r131-F10 (fleet input ruling / the web DeliveryAddressField halo twin):
 * ONE field-focus grammar for every mobile input. Focused = 2px accent (gold)
 * border; resting = 1px hairline (destructive when the field carries an
 * error). The <Input> primitive consumes it via its own focused state, and
 * the raw TextInputs on MenuScreen/SubscribeScreens import the same helper —
 * before this, the primitive alone had `focus:border-ring` while every sheet
 * field had no focus treatment at all (A2 P1-3 mobile leg).
 */
export function fieldFocusBorderStyle(focused: boolean, error?: boolean) {
  return focused
    ? { borderWidth: 2, borderColor: colors.terracotta }
    : { borderWidth: 1, borderColor: error ? colors.rose : colors.hairline };
}

export function Input({ className, error, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      className={cn(
        // r126-M6: minHeight (was h-12) — fixed height clipped input text at
        // fontScale ≥1.3; py-3 keeps a ≥44px resting box with room to grow.
        // r132-F2b (A4 S2, r131 fleet input ruling — the web root fix
        // 48→44 finally reaches the mobile leg): min-h-12 (48px) → min-h-11
        // (44px). The primitive was the ONLY 48px field left — every raw
        // sheet field already rode minHeight 44 (MenuScreen/SubscribeScreens)
        // and the search row 44; one height for all fields.
        "min-h-11 rounded-md bg-input px-4 py-3 text-base text-foreground",
        "font-sans placeholder:text-muted-foreground", className,
      )}
      style={fieldFocusBorderStyle(focused, error)}
      placeholderTextColor={colors.muted}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      {...props}
    />
  );
}

export function PasswordInput({ className, error, onFocus, onBlur, ...props }: InputProps) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View className="relative">
      <TextInput
        className={cn(
          // r130 W2-4 (RTL): pr-12 → pe-12 — the eye toggle sits at `end-2`,
          // so the text inset must be logical too (physical right padding
          // starved the toggle's side in this forced-RTL app).
          // r132-F2b (A4 S2): 44px like <Input> (was min-h-12 — the fleet
          // input ruling; see the Input comment above).
          "min-h-11 rounded-md bg-input px-4 py-3 pe-12 text-base text-foreground",
          "font-sans placeholder:text-muted-foreground", className,
        )}
        style={fieldFocusBorderStyle(focused, error)}
        placeholderTextColor={colors.muted} secureTextEntry={!show}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        {...props}
      />
      {/* r131-F10: the eye toggle rides PressableScale (0.97@80ms) like every
          other control — it was the last silent raw Pressable in a shared
          primitive (no role either — role now defaults to "button"). The
          absolute end-2/top-0/bottom-0 box keeps a 40px-wide, full-height
          lane; hitSlop 4 pushes the effective target past the 44px floor. */}
      <PressableScale
        onPress={() => setShow((v) => !v)}
        hitSlop={4}
        accessibilityLabel={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        style={{ position: "absolute", end: 8, top: 0, bottom: 0, width: 40, alignItems: "center", justifyContent: "center" }}
      >
        {show ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}
      </PressableScale>
    </View>
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-sm font-medium text-foreground mb-2 font-sans", className)}>{children}</Text>;
}
