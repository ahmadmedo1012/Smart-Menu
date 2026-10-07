import { cva, type VariantProps } from "class-variance-authority";
import { Pressable, Text, type PressableProps } from "react-native";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "flex items-center justify-center gap-2 rounded-md active:opacity-80 disabled:opacity-50",
  {
    variants: {
      variant: {
        orange: "bg-brand-500", flame: "bg-flame",
        outline: "border border-border bg-transparent", ghost: "bg-transparent",
        destructive: "bg-destructive", secondary: "bg-muted",
      },
      size: {
        sm: "h-9 px-3", default: "h-11 px-5", lg: "h-14 px-8", icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "orange", size: "default" },
  },
);

const buttonTextVariants = cva("font-semibold text-center font-sans", {
  variants: {
    variant: {
      // Madarek: void ink #05070F rides the gold accent and the rose danger
      // base (dark --accent-fg / --danger-fg) — never white-on-accent.
      orange: "text-on-accent", flame: "text-on-accent", outline: "text-foreground",
      ghost: "text-foreground", destructive: "text-on-accent", secondary: "text-foreground",
    },
    size: { sm: "text-sm", default: "text-base", lg: "text-lg", icon: "text-base" },
  },
  defaultVariants: { variant: "orange", size: "default" },
});

export interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  title?: string;
  loading?: boolean;
}

export function Button({ variant, size, title, loading, children, className, disabled, ...props }: ButtonProps) {
  return (
    <Pressable className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading ? (
        <Text className={buttonTextVariants({ variant, size })}>…</Text>
      ) : children ?? (
        <Text className={buttonTextVariants({ variant, size })}>{title}</Text>
      )}
    </Pressable>
  );
}
