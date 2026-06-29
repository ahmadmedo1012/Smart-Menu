"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingWhatsApp({ phone }: { phone?: string }) {
	const adminPhone = phone || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "218911111111";
	return (
		<a
			href={`https://wa.me/${adminPhone.replace(/^\+/, "")}`}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				"fixed bottom-6 end-6 z-[60]",
				"size-14 rounded-full bg-orange text-white",
				"flex items-center justify-center",
				"shadow-xl shadow-orange/30",
				"hover:bg-[#e05f0a] hover:scale-105 hover:shadow-2xl hover:shadow-orange/40",
				"transition-all duration-300",
				"animate-fade-in"
			)}
			aria-label="تواصل عبر واتساب"
			style={{ animationDelay: "3s", animationFillMode: "both" }}
		>
			<MessageCircle className="size-7" />
		</a>
	);
}
