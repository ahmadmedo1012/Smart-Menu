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
	const line = "absolute inset-x-0 h-[2px] rounded-full bg-foreground transition-all duration-500 origin-center"
	return (
		<button
			onClick={onClick}
			className="lg:hidden relative size-9 rounded-sm border border-border/20 flex items-center justify-center hover:bg-orange-muted transition-colors"
			aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
		>
			<span className="relative size-4">
				<span className={cn(line, "top-[2px]", open && "top-[7px] rotate-45")} />
				<span className={cn(line, "top-[7px]", open && "opacity-0 scale-x-0")} />
				<span className={cn(line, "top-[12px]", open && "top-[7px] -rotate-45")} />
			</span>
		</button>
	)
}

interface MobileMenuProps { open: boolean; onClose: () => void; pathname: string }

function MobileMenu({ open, onClose, pathname }: MobileMenuProps) {
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		if (open) {
			setMounted(true)
			document.body.style.overflow = "hidden"
		} else {
			const timer = setTimeout(() => setMounted(false), 500)
			document.body.style.overflow = ""
			return () => clearTimeout(timer)
		}
		return () => { document.body.style.overflow = "" }
	}, [open])

	if (!mounted) return null

	return (
		<>
			<div
				className={cn(
					"fixed inset-0 z-40 bg-black/60 backdrop-blur-md transition-all duration-500 ease-smooth-out",
					open ? "opacity-100" : "opacity-0 pointer-events-none"
				)}
				onClick={onClose}
				aria-hidden="true"
			/>

			<div
				className={cn(
					"fixed top-4 inset-x-4 z-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
					open
						? "opacity-100 translate-y-0 scale-100"
						: "opacity-0 -translate-y-6 scale-95 pointer-events-none"
				)}
			>
				<div className="rounded-md glass-strong overflow-hidden shadow-2xl">
					<div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
						<Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-7 w-auto" priority />
						<button
							onClick={onClose}
							className="size-8 rounded-sm border border-border/30 flex items-center justify-center hover:bg-orange-muted transition-colors"
							aria-label="إغلاق القائمة"
						>
							<X className="size-4" />
						</button>
					</div>

					<nav className="px-3 py-4 space-y-1">
						{landingLinks.map((link, i) => {
							const isActive = link.href === "/login" ? pathname === "/login" : pathname.startsWith(link.href)
							const Icon = link.icon
							return (
								<Link
									key={link.href}
									href={link.href}
									onClick={onClose}
									className={cn(
										"flex items-center gap-3 px-4 py-3.5 rounded-sm text-sm font-medium transition-all duration-500",
										"opacity-0 translate-y-8 blur-[4px]",
										open && "opacity-100 translate-y-0 blur-0",
										isActive
											? "bg-orange-muted text-orange"
											: "text-foreground/80 hover:bg-orange-muted hover:text-foreground"
									)}
									style={{
										transitionDelay: `${80 + i * 80}ms`,
										transitionProperty: "opacity, transform, filter, background-color, color",
									}}
								>
									<Icon className="size-4 text-orange shrink-0" />
									<span>{link.label}</span>
								</Link>
							)
						})}
						<div
							className="pt-2 px-4 opacity-0 translate-y-8 blur-[4px] transition-all duration-500"
							style={{
								transitionDelay: "320ms",
								...(open ? { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" } : {}),
							}}
						>
							<Link href="/subscribe" onClick={onClose}>
								<Button variant="orange" size="lg" className="w-full rounded-sm text-sm">
									ابدأ الآن مجاناً
								</Button>
							</Link>
						</div>
					</nav>
				</div>
			</div>
		</>
	)
}

function ActiveUnderline({ active }: { active: boolean }) {
	return (
		<span
			className={cn(
				"absolute -bottom-px inset-x-2 h-[2px] rounded-full bg-orange transition-all duration-300 ease-smooth-out",
				active ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
			)}
		/>
	)
}

export function Header({ className }: HeaderProps) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const pathname = usePathname()

	const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

	return (
		<>
			<header
				className={cn(
					"fixed top-4 inset-x-4 z-30 max-w-[1220px] mx-auto",
					"h-14 rounded-sm glass-strong",
					"opacity-0 animate-fade-in [animation-delay:100ms] [animation-fill-mode:forwards]",
					className
				)}
			>
				<div className="absolute bottom-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-orange/15 to-transparent pointer-events-none" />

				<nav className="px-4 h-full flex items-center justify-between" aria-label="الرئيسية">
					<div className="flex items-center gap-3">
						<HamburgerButton open={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} />
						<Link href="/" className="flex items-center gap-2 shrink-0">
							<Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-7 w-auto" priority />
						</Link>
					</div>

					<div className="hidden lg:flex items-center gap-1">
						{landingLinks.map((link) => {
							const isActive =
								link.href === "/login"
									? pathname === "/login"
									: pathname.startsWith(link.href.replace(/:.*/, ""))
							return (
								<Link
									key={link.href}
									href={link.href}
									className={cn(
										"relative px-3 py-1.5 rounded-sm text-sm transition-colors duration-200",
										isActive
											? "text-orange font-medium"
											: "text-muted-foreground hover:text-foreground hover:bg-orange-muted"
									)}
								>
									{link.label}
									<ActiveUnderline active={isActive} />
								</Link>
							)
						})}
					</div>

					<div className="flex items-center gap-2">
						<ThemeToggle />
						<Link href="/subscribe">
							<Button variant="orange" size="sm" className="rounded-sm text-xs h-8 px-3">
								ابدأ الآن مجاناً
							</Button>
						</Link>
					</div>
				</nav>
			</header>

			<MobileMenu open={mobileMenuOpen} onClose={closeMobileMenu} pathname={pathname} />
		</>
	)
}
