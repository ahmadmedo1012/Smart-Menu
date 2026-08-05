"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {} from 'lucide-react';
import { MotionArrowRight } from '@/components/ui/motion-icons';

interface BackButtonProps {
  href?: string
}

export function BackButton({ href }: BackButtonProps) {
  const router = useRouter()

  if (href) {
    return (
      <Link href={href}>
        <Button variant="ghost" size="sm">
          <MotionArrowRight className="ms-1 size-4" />
          العودة
        </Button>
      </Link>
    )
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => router.back()}>
      <MotionArrowRight className="ms-1 size-4" />
      العودة
    </Button>
  )
}
