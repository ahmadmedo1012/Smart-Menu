import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <View className={cn("rounded-lg border border-border bg-card p-4", className)}>{children}</View>;
}

const badgeVariants = cva("rounded-full px-2.5 py-0.5", {
  variants: {
    variant: {
      default: "bg-muted", orange: "bg-brand-500", success: "bg-success",
      warning: "bg-warning", destructive: "bg-destructive", outline: "border border-border",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends VariantProps<typeof badgeVariants> { label: string; className?: string; }

export function Badge({ variant, label, className }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)}>
      <Text className="text-center font-sans text-xs font-semibold">{label}</Text>
    </View>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <View className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function Spinner({ size = "large" }: { size?: "small" | "large" }) {
  return <ActivityIndicator size={size} color="#bc4700" />;
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      {icon ? <View className="mb-4 opacity-60">{icon}</View> : null}
      <Text className="text-lg font-semibold text-foreground text-center font-sans">{title}</Text>
      {description ? <Text className="text-sm text-muted-foreground text-center mt-2 font-sans">{description}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <Text className="text-lg font-semibold text-destructive text-center font-sans">{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} className="mt-4 h-10 rounded-md bg-brand-500 px-4 items-center justify-center">
          <Text className="text-white font-sans font-semibold">إعادة المحاولة</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
