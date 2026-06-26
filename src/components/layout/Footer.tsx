import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { MessageCircle } from "lucide-react"

interface FooterProps { className?: string; partnerSlug?: string }

const QUICK_LINKS = [
	{ href: "/pricing", label: "الخطط" },
	{ href: "/menu/al-waha-cafe", label: "منيو تجريبي" },
	{ href: "/login", label: "تسجيل الدخول" },
	{ href: "/subscribe", label: "اشترك الآن" },
];

const SERVICES = [
	{ href: "#", label: "منيو إلكتروني" },
	{ href: "#", label: "طلب عبر واتساب" },
	{ href: "#", label: "برنامج ولاء" },
	{ href: "#", label: "إحصائيات وتحليلات" },
	{ href: "#", label: "QR كود مخصص" },
];

const ARTICLES = [
	{ href: "#", label: "القائمة الرقمية" },
	{ href: "#", label: "الحلول التسويقية" },
	{ href: "#", label: "إدارة المطاعم" },
	{ href: "#", label: "ريادة الأعمال" },
	{ href: "#", label: "قصص نجاح" },
];

export function Footer({ className, partnerSlug = "al-waha-cafe" }: FooterProps) {
	return (
		<footer className={cn("bg-[#111013] pt-16 pb-10 border-t border-white/5", className)}>
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="grid md:grid-cols-6 md:gap-6 lg:gap-8 mb-12">
					{/* Brand */}
					<div className="md:col-span-2">
						<Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-8 w-auto mb-4 brightness-0 invert" loading="lazy" />
						<p className="text-sm text-muted-foreground max-w-xs leading-relaxed border-r-2 border-orange/40 pr-3 mb-4">
							منصة رقمية لإدارة منيو المطاعم والمقاهي واستقبال الطلبات عبر واتساب
						</p>
						<div className="flex gap-3">
							<a href="#" className="size-9 rounded-[6px] bg-white/5 flex items-center justify-center hover:bg-orange/20 transition-colors" aria-label="فيسبوك">
								<svg className="size-4 hover:text-orange" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
							</a>
							<a href="#" className="size-9 rounded-[6px] bg-white/5 flex items-center justify-center hover:bg-orange/20 transition-colors" aria-label="انستغرام">
								<svg className="size-4 hover:text-orange" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
							</a>
							<a href="#" className="size-9 rounded-[6px] bg-white/5 flex items-center justify-center hover:bg-orange/20 transition-colors" aria-label="يوتيوب">
									<svg className="size-4 hover:text-orange" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>
								</a>
							<a href="https://wa.me/218911111111" className="size-9 rounded-[6px] bg-white/5 flex items-center justify-center hover:bg-orange/20 transition-colors" aria-label="واتساب"><MessageCircle className="size-4 hover:text-orange" /></a>
						</div>
					</div>

					{/* Quick Links */}
					<div>
						<h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-orange" />
							روابط سريعة
						</h4>
						<div className="space-y-3 text-sm text-muted-foreground">
							{QUICK_LINKS.map((link) => (
								<Link key={link.label} href={link.href} className="block w-fit hover:text-white transition-colors">{link.label}</Link>
							))}
						</div>
					</div>

					{/* Services */}
					<div>
						<h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-orange" />
							الخدمات
						</h4>
						<div className="space-y-3 text-sm text-muted-foreground">
							{SERVICES.map((s) => (
								<Link key={s.label} href={s.href} className="block w-fit hover:text-white transition-colors">{s.label}</Link>
							))}
						</div>
					</div>

					{/* Articles */}
					<div>
						<h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
							<span className="size-1.5 rounded-full bg-orange" />
							مقالات تهمك
						</h4>
						<div className="space-y-3 text-sm text-muted-foreground">
							{ARTICLES.map((a) => (
								<Link key={a.label} href={a.href} className="block w-fit hover:text-white transition-colors">{a.label}</Link>
							))}
						</div>
					</div>
				</div>

				{/* Bottom bar */}
				<div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-3">
					<p className="text-xs text-muted-foreground/60">
						&copy; {new Date().getFullYear()} الربط الذكي | Smart Menu. جميع الحقوق محفوظة.
					</p>
					<div className="flex gap-4 text-xs text-muted-foreground/60">
						<span className="cursor-default hover:text-white transition-colors">شروط الاستخدام</span>
						<span className="cursor-default hover:text-white transition-colors">سياسة الخصوصية</span>
						<span className="cursor-default hover:text-white transition-colors">استعادة كلمة المرور</span>
					</div>
				</div>
			</div>
		</footer>
	)
}
