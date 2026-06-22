"use client";
import { useLottie } from "lottie-react";
import emptyAnim from "../../../public/lottie/empty.json";
import { Button } from "@/components/ui/button";

export default function LottieEmpty({
  message = "لا توجد بيانات",
  action,
}: {
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  const { View } = useLottie({ animationData: emptyAnim, loop: true });
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="size-36 pointer-events-none">{View}</div>
      <p className="text-base font-medium text-muted-foreground">{message}</p>
      {action && (
        <Button variant="gradient-outline" onClick={action.onClick} className="rounded-xl">
          {action.label}
        </Button>
      )}
    </div>
  );
}
