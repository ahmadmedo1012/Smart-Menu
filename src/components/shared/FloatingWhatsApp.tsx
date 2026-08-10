"use client";

import {} from 'lucide-react';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import { cn } from "@/lib/utils";
import { normalizeWaNumber } from "@/lib/whatsapp";

export function FloatingWhatsApp({ phone }: { phone?: string }) {
	const adminPhone = normalizeWaNumber(phone || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "");
	if (!adminPhone) return null;
	return (
		<a
			href={`https://wa.me/${adminPhone}`}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				"fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] end-4 sm:end-6 z-[60]",
				"size-14 rounded-full bg-orange text-white",
				"flex items-center justify-center",
				"shadow-xl shadow-orange/30",
				"hover:bg-orange/90 hover:scale-105 hover:shadow-2xl hover:shadow-orange/40",
				"transition-all duration-300",
				"animate-fade-in"
			)}
			aria-label="تواصل عبر واتساب"
			style={{ animationDelay: "3s", animationFillMode: "both" }}
		>
			<AnimatedMessageCircle className="size-7" />
		</a>
	);
}
