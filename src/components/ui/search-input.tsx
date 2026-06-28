"use client"

import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  "aria-label"?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "ابحث...",
  className,
  "aria-label": ariaLabel,
}: SearchInputProps) {
  return (
    <div className={cn("relative flex-1", className)}>
      <Search
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="h-11 w-full rounded-md border border-border/30 bg-card/50 pr-11 pl-4 text-sm outline-none transition-all focus-visible:border-orange focus-visible:ring-4 focus-visible:ring-orange/20 focus-visible:ring-offset-0"
      />
    </div>
  )
}
