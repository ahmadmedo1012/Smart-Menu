"use client";
import { useLottie } from "lottie-react";
import loadingAnim from "../../../public/lottie/loading.json";

export default function LottieLoading({ message = "جاري التحميل..." }: { message?: string }) {
  const { View } = useLottie({ animationData: loadingAnim, loop: true });
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="size-32 pointer-events-none">{View}</div>
      <p className="text-sm text-muted-foreground animate-breath">{message}</p>
    </div>
  );
}
