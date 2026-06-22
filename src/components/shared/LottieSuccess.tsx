"use client";
import { useLottie } from "lottie-react";
import successAnim from "../../../public/lottie/success.json";

export default function LottieSuccess({
  message = "تم بنجاح!",
  submessage,
}: {
  message?: string;
  submessage?: string;
}) {
  const { View } = useLottie({ animationData: successAnim, loop: false });
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="size-32 pointer-events-none">{View}</div>
      <p className="text-lg font-bold">{message}</p>
      {submessage && <p className="text-sm text-muted-foreground">{submessage}</p>}
    </div>
  );
}
