"use client"

import { useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { AdminSidebar } from "@/components/layout/AdminSidebar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { Menu, Moon, Sun, Store } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme, setTheme } = useTheme()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden fixed top-3 right-3 z-50"
            />
          }
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="right" className="p-0 w-60">
          <div className="flex items-center gap-2 p-4 border-b">
            <Store className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">الربط الذكي</span>
          </div>
          <nav className="p-2 space-y-1">
            {[
              { href: "/admin", label: "لوحة التحكم" },
              { href: "/admin/menu", label: "إدارة المنيو" },
              { href: "/admin/orders", label: "الطلبات" },
              { href: "/admin/settings", label: "الإعدادات" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 md:px-6 h-14">
            <div className="md:hidden" />
            <h1 className="text-sm font-semibold text-muted-foreground">
              لوحة الإدارة
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
