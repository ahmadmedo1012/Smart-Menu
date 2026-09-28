"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MotionArrowRight } from '@/components/ui/motion-icons';

// r121-O-5: the empty `import {} from 'lucide-react'` (an icon-swap leftover)
// and the no-href router.back() branch were deleted — all 3 callers pass an
// explicit href, so the prop is required now.
interface BackButtonProps {
  href: string
}

export function BackButton({ href }: BackButtonProps) {
  return (
    <Link href={href}>
      <Button variant="ghost" size="sm">
        <MotionArrowRight className="ms-1 size-4" />
        العودة
      </Button>
    </Link>
  )
}
