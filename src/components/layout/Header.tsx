"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Star, Store, LayoutDashboard, X } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { ThemeToggle } from "@/components/shared/ThemeToggle"

interface HeaderProps { className?: string }

const PARTNER_SLUG = "al-waha-cafe"

const landingLinks = [
	{ href: "/pricing", label: "الخطط والأسعار", icon: Star },
	{ href: `/menu/${PARTNER_SLUG}`, label: "منيو تجريبي", icon: Store },
	{ href: "/login", label: "لوحة التحكم", icon: LayoutDashboard },
]

interface HamburgerProps { open: boolean; onClick: () => void }

function HamburgerButton({ open, onClick }: HamburgerProps) {
	return (
		<button
			onClick={onClick}
			className="lg:hidden relative size-10 rounded-sm border border-border flex items-center justify-center hover:bg-orange/20 transition-all duration-200"
			aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
		>
			<span className="relative size-4">
				<span className={cn("absolute inset-x-0 top-[3px] h-[2px] rounded-full bg-foreground transition-all duration-300", open && "opacity-0")} />
				<span className={cn("absolute inset-x-0 top-[7px] h-[2px] rounded-full bg-foreground transition-all duration-300", open && "rotate-45 !top-[7px]")} />
				<span className={cn("absolute inset-x-0 top-[7px] h-[2px] rounded-full bg-foreground transition-all duration-300", open && "-rotate-45")} />
				<span className={cn("absolute inset-x-0 bottom-[3px] h-[2px] rounded-full bg-foreground transition-all duration-300", open && "opacity-0")} />
			</span>
		</button>
	)
}

interface MobileMenuProps { open: boolean; onClose: () => void; pathname: string }

function MobileMenu({ open, onClose, pathname }: MobileMenuProps) {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		if (open) { setMounted(true); document.body.style.overflow = "hidden" }
		else { const t = setTimeout(() => setMounted(false), 500); document.body.style.overflow = ""; return () => clearTimeout(t) }
		return () => { document.body.style.overflow = "" }
	}, [open])

	if (!mounted) return null

	return (
		<>
			<div className={cn("fixed inset-0 z-40 bg-black/70 backdrop-blur-md transition-all duration-500", open ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={onClose} aria-hidden="true" />
			<div className={cn("fixed top-0 left-0 right-0 z-50 max-w-md mx-auto px-4 pt-4 transition-all duration-500", open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-6 pointer-events-none")}>
				<div className="rounded-md bg-background border border-border/10 shadow-2xl overflow-hidden">
					<div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
						<Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-8 w-auto" priority />
						<button onClick={onClose} className="size-8 rounded-sm border border-border/10 flex items-center justify-center hover:bg-orange/20 transition-colors" aria-label="إغلاق"><X className="size-4 text-foreground" /></button>
					</div>
					<nav className="px-4 py-5 space-y-1">
						{landingLinks.map((link, i) => {
							const isActive = link.href === "/login" ? pathname === "/login" : pathname.startsWith(link.href)
							const Icon = link.icon
							return (
								<Link key={link.href} href={link.href} onClick={onClose}
									className={cn("flex items-center gap-3 px-4 py-3.5 rounded-sm text-base font-medium transition-all duration-500 opacity-0 translate-y-6", open && "opacity-100 translate-y-0", isActive ? "bg-orange/15 text-orange" : "text-muted-foreground hover:bg-orange/10 hover:text-foreground")}
									style={{ transitionDelay: `${80 + i * 60}ms` }}
								>
									<Icon className="size-5 text-orange shrink-0" />
									{link.label}
								</Link>
							)
						})}
						<div className="pt-4 px-4">
							<Link href="/subscribe" onClick={onClose}>
								<Button variant="orange" size="lg" className="w-full text-base">ابدأ الآن مجاناً</Button>
							</Link>
						</div>
					</nav>
				</div>
			</div>
		</>
	)
}

export function Header({ className }: HeaderProps) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const pathname = usePathname()
	const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

	return (
		<>
			<header className={cn(
				"fixed top-0 inset-x-0 z-30",
				"h-[12vh] min-h-[64px] max-h-[88px] bg-background/80 backdrop-blur-xl border-b border-border/50",
				"opacity-0 animate-fade-in [animation-delay:100ms] [animation-fill-mode:forwards]",
				className
			)}>
				<nav className="max-w-[1220px] mx-auto px-10 h-full flex items-center justify-between" aria-label="الرئيسية">
					<div className="flex items-center gap-4">
						<HamburgerButton open={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} />
						<Link href="/" className="flex items-center gap-2 shrink-0">
							<Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-8 w-auto" priority />
						</Link>
					</div>

					<div className="hidden lg:flex items-center gap-2">
						{landingLinks.map((link) => {
							const isActive = link.href === "/login" ? pathname === "/login" : pathname.startsWith(link.href.replace(/:.*/, ""))
							return (
								<Link key={link.href} href={link.href} className={cn(
									"px-4 py-2 rounded-sm text-base font-medium transition-all duration-200",
									isActive ? "text-orange underline underline-offset-4 decoration-orange" : "text-foreground/80 hover:text-foreground hover:opacity-65"
								)}>
									{link.label}
								</Link>
							)
						})}
					</div>

					<div className="flex items-center gap-3">
						<ThemeToggle />
						<Link href="/login">
							<Button variant="outline" size="sm">تسجيل الدخول</Button>
						</Link>
						<Link href="/subscribe">
							<Button variant="orange" size="sm">ابدأ الآن مجاناً</Button>
						</Link>
					</div>
				</nav>
			</header>

			<MobileMenu open={mobileMenuOpen} onClose={closeMobileMenu} pathname={pathname} />
		</>
	)
}
