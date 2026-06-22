import { cn } from "@/lib/utils"

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "border-t border-border bg-background py-6 text-center text-sm text-muted-foreground",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4">
        <p>&copy; {new Date().getFullYear()} الربط الذكي | Smart Menu. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  )
}
