import { useState } from "react";
import { TextInput, View, Text, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Pressable } from "react-native";
import { cn } from "@/lib/utils";

export interface InputProps extends TextInputProps { error?: boolean; }

export function Input({ className, error, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        "h-12 rounded-md border border-border bg-input px-4 py-2 text-base text-foreground",
        "font-sans placeholder:text-muted-foreground focus:border-ring",
        error && "border-destructive", className,
      )}
      placeholderTextColor="#8E97B8" {...props}
    />
  );
}

export function PasswordInput({ className, error, ...props }: InputProps) {
  const [show, setShow] = useState(false);
  return (
    <View className="relative">
      <TextInput
        className={cn(
          "h-12 rounded-md border border-border bg-input px-4 py-2 pr-12 text-base text-foreground",
          "font-sans placeholder:text-muted-foreground focus:border-ring",
          error && "border-destructive", className,
        )}
        placeholderTextColor="#8E97B8" secureTextEntry={!show} {...props}
      />
      <Pressable onPress={() => setShow((v) => !v)} className="absolute end-2 top-0 bottom-0 w-10 items-center justify-center" accessibilityLabel={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
        {show ? <EyeOff size={20} color="#8E97B8" /> : <Eye size={20} color="#8E97B8" />}
      </Pressable>
    </View>
  );
}

export function Textarea({ className, error, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        "min-h-[88px] rounded-md border border-border bg-input px-4 py-3 text-base text-foreground",
        "font-sans placeholder:text-muted-foreground focus:border-ring",
        error && "border-destructive", className,
      )}
      placeholderTextColor="#8E97B8" multiline textAlignVertical="top" {...props}
    />
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-sm font-medium text-foreground mb-2 font-sans", className)}>{children}</Text>;
}
