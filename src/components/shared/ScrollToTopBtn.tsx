"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScrollToTopBtn() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const onScroll = () => setVisible(window.scrollY > 400);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<button
			onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
			className={cn(
				"fixed bottom-6 start-6 z-[60]",
				"size-14 rounded-full bg-orange text-white",
				"flex items-center justify-center",
				"shadow-xl shadow-orange/30",
				"hover:bg-[#e05f0a]",
				"transition-all duration-300",
				visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
			)}
			aria-label="الذهاب للأعلى"
		>
			<ArrowUp className="size-6" />
		</button>
	);
}
