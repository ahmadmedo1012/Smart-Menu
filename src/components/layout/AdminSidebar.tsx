"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollText, UtensilsCrossed, Settings, QrCode, LayoutDashboard, Menu } from "lucide-react"
import { useState } from "react"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const navItems: NavItem[] = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/admin/menu", label: "قائمة الطعام", icon: UtensilsCrossed },
  { href: "/admin/orders", label: "الطلبات", icon: ScrollText },
  { href: "/admin/qr", label: "رمز QR", icon: QrCode },
  { href: "/admin/settings", label: "الاعدادات", icon: Settings },
]

interface AdminSidebarProps {
  className?: string
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  const sidebarContent = (
    <nav className="flex flex-col gap-1 p-3">
      <Link
        href="/admin"
        className="mb-4 flex items-center gap-2 px-2 text-lg font-bold text-primary"
      >
        Smart Menu
      </Link>

      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSheetOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
              isActive
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile trigger + Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger>
          <Button
            variant="ghost"
            size="icon"
            className={cn("fixed top-3 start-3 z-50 size-8 lg:hidden", className)}
            aria-label="فتح القائمة"
          >
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-64 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-56 shrink-0 border-s border-border bg-background lg:flex lg:flex-col">
        {sidebarContent}
      </aside>
    </>
  )
}
