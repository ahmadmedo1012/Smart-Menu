import { View, ActivityIndicator } from "react-native";
import { TriangleAlert } from "lucide-react-native";
import type { ReactNode } from "react";

import { Text } from "@/components/ui/Text";
import { PressableScale } from "@/components/motion/PressableScale";
import { colors, pastelFamilies } from "@/theme/colors";
import { radius } from "@/theme/radius";

/**
 * r126-M9: Card (0 usages), Badge (0 usages + a latent 1.2:1 contrast bug
 * on the muted variant) were deleted — screens hand-roll their cards.
 * Skeleton was deleted with them, then RESURRECTED by r132-F2b as its own
 * module (ui/Skeleton.tsx — the family shape-skeleton primitive) and is
 * now the loading state on 7 screens (Menu, Pricing, SubscribePlan, owner
 * dashboard/orders/detail/QR); this barrel keeps only the state family.
 * Full-screen loading is a shape skeleton today, not a Spinner (r133-F3
 * finished the sweep — the one surviving Spinner is the orders list's
 * load-more pagination feedback).
 *
 * r131-F10: the state family converges on the canonical state well —
 * 56px r-xl icon tile (grey family for empty, rose for error), title
 * 18px/600, matching the web EmptyState fix and the smart-order
 * states.tsx twin (fleet ruling "empty = 56 grey / 18/600").
 */

export function Spinner({ size = "large" }: { size?: "small" | "large" }) {
  return <ActivityIndicator size={size} color={colors.terracotta} />;
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      {icon ? (
        /* r131-F10 (A2 P2-21 / A11 SM-1 twin): the bare opacity-60 icon now
           rides the canonical grey-family well — 56px r-xl tile on --c-grey-bg
           (#161D33), icon in grey-deep — instead of floating with no ground.
           Pass a 24px grey-deep glyph (e.g. <ShoppingBag size={24}
           color={pastelFamilies.grey.deep} />). */
        <View style={{
          width: 56, height: 56, borderRadius: radius.xl,
          backgroundColor: pastelFamilies.grey.bg,
          alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          {icon}
        </View>
      ) : null}
      {/* r131 fleet ruling: empty title = 18px/600 (supersedes the r130 700
          heading note — state surfaces carry their own register). */}
      <Text className="text-lg font-semibold text-foreground text-center font-sans">{title}</Text>
      {description ? <Text className="text-sm text-muted-foreground text-center mt-2 font-sans">{description}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      {/* r131-F10: the rose-family twin of the EmptyState well (SO states.tsx
          ErrorState grammar) — 56px r-xl tile on --c-rose-bg with the alert
          glyph; the message keeps its destructive ink. */}
      <View style={{
        width: 56, height: 56, borderRadius: radius.xl,
        backgroundColor: colors.roseBg,
        alignItems: "center", justifyContent: "center", marginBottom: 16,
      }}>
        <TriangleAlert size={24} color={colors.rose} />
      </View>
      <Text className="text-lg font-semibold text-destructive text-center font-sans">{message}</Text>
      {onRetry ? (
        /* r131-F10 (fix 5): 44px touch floor (was min-h-10 = 40px) + the
           PressableScale press register (was a silent raw Pressable). */
        <PressableScale
          onPress={onRetry}
          style={{ marginTop: 16, minHeight: 44, borderRadius: radius.md, backgroundColor: colors.terracotta, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", justifyContent: "center" }}>
          <Text className="text-on-accent font-sans font-semibold" maxFontSizeMultiplier={1.4}>إعادة المحاولة</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

/* Phase 6 (P6-2-cR): ComingSoon was deleted — zero consumers remain. Its
 * two families got real replacements: the owner Menu/Restaurants/Reviews/
 * Loyalty screens ship real implementations, and the admin stubs render the
 * intentional web-only identity state (plate well + «هذه الشاشة متاحة
 * حالياً على نسخة الويب» + a link-out affordance) in AdminScreens.tsx.
 * r126-M10's honesty ruling («not-built-yet must not read as empty data»)
 * survives in both. */
