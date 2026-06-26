import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface FooterProps { className?: string; partnerSlug?: string }

export function Footer({ className, partnerSlug = "al-waha-cafe" }: FooterProps) {
	return (
		<footer className={cn("bg-[#111013] pt-16 pb-10 border-t border-white/5", className)}>
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="grid md:grid-cols-4 gap-8 md:gap-6 mb-12">
					{/* Brand column */}
					<div className="md:col-span-2">
						<Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-8 w-auto mb-4 brightness-0 invert" loading="lazy" />
						<p className="text-sm text-muted-foreground max-w-xs leading-relaxed border-r-2 border-orange/40 pr-3">
							منصة رقمية لإدارة منيو المطاعم والمقاهي واستقبال الطلبات عبر واتساب
						</p>
					</div>

					{/* Quick links */}
					<div>
						<h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-orange" />
							روابط سريعة
						</h4>
						<div className="space-y-3 text-sm text-muted-foreground">
							<Link href="/pricing" className="block w-fit hover:text-white transition-colors">الخطط</Link>
							<Link href={`/menu/${partnerSlug}`} className="block w-fit hover:text-white transition-colors">منيو تجريبي</Link>
							<Link href="/login" className="block w-fit hover:text-white transition-colors">تسجيل الدخول</Link>
						</div>
					</div>

					{/* Contact */}
					<div>
						<h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-orange" />
							تواصل معنا
						</h4>
						<div className="space-y-3 text-sm text-muted-foreground">
							<p className="hover:text-white transition-colors cursor-default">واتساب: +218 91 111 1111</p>
							<p className="hover:text-white transition-colors cursor-default">بريد: info@rabtzaki.ly</p>
						</div>
					</div>
				</div>

				{/* Bottom bar */}
				<div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
					<p className="text-xs text-muted-foreground/60">
						&copy; {new Date().getFullYear()} الربط الذكي | Smart Menu. جميع الحقوق محفوظة.
					</p>
					<div className="flex gap-4 text-xs text-muted-foreground/60">
						<span className="cursor-default hover:text-white transition-colors">شروط الاستخدام</span>
						<span className="cursor-default hover:text-white transition-colors">سياسة الخصوصية</span>
					</div>
				</div>
			</div>
		</footer>
	)
}
