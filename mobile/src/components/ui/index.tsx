import { View, ActivityIndicator, Pressable } from "react-native";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";

/**
 * r126-M9: Card (0 usages), Badge (0 usages + a latent 1.2:1 contrast bug
 * on the muted variant) and Skeleton (0 usages) were deleted — screens
 * hand-roll their cards and loading is a full-screen Spinner today.
 */

export function Spinner({ size = "large" }: { size?: "small" | "large" }) {
  return <ActivityIndicator size={size} color={colors.gold} />;
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      {icon ? <View className="mb-4 opacity-60">{icon}</View> : null}
      {/* r130 W2-4: heading register — 700 (canonical h-weights; --fw-black
          resolves 700, tokens.css:1069). Was font-semibold 600. */}
      <Text className="text-lg font-bold text-foreground text-center font-sans">{title}</Text>
      {description ? <Text className="text-sm text-muted-foreground text-center mt-2 font-sans">{description}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      {/* r130 W2-4: heading register 700 (was 600) — see EmptyState note. */}
      <Text className="text-lg font-bold text-destructive text-center font-sans">{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" className="mt-4 min-h-10 rounded-md bg-brand-500 px-4 items-center justify-center py-2">
          <Text className="text-on-accent font-sans font-semibold" maxFontSizeMultiplier={1.4}>إعادة المحاولة</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * r126-M10 (A6 P1-3): honest coming-soon state for stub screens. The 11
 * admin screens + 3 owner stubs previously rendered EmptyStates titled like
 * real data surfaces («إدارة المستخدمين», «لا توجد تقييمات بعد») — reads
 * as fetched-but-empty, i.e. fake data that looks real. This component says
 * plainly: the screen is not built yet, the web app is where it works today.
 */
export function ComingSoon({
  title,
  icon,
  webHint = true,
}: {
  title: string;
  icon?: ReactNode;
  webHint?: boolean;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <View style={{
        width: 72, height: 72, borderRadius: 9999, backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.hairline, alignItems: "center", justifyContent: "center",
        marginBottom: 20,
      }}>
        <View style={{ opacity: 0.7 }}>{icon}</View>
      </View>
      <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 18, fontWeight: "700", color: colors.sand, textAlign: "center" }}>{title}</Text>
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface2,
        borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 10,
      }}>
        <View style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: colors.gold }} />
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 12, fontWeight: "600", color: colors.gold }} maxFontSizeMultiplier={1.4}>قريبًا</Text>
      </View>
      {webHint ? (
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 12, lineHeight: 20 }}>
          هذه الشاشة قيد التطوير — يمكنك إدارتها حاليًا من لوحة التحكم على الويب
        </Text>
      ) : null}
    </View>
  );
}
