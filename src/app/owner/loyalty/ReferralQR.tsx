"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

export function ReferralQR({ url }: { url: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 180, margin: 2, color: { dark: "#000", light: "#fff" } })
      .then(setQrDataUrl).catch(() => {})
  }, [url])

  if (!qrDataUrl) return <div className="size-[180px] animate-pulse rounded-xl bg-muted" />

  return (
    <div className="flex flex-col items-center gap-2">
      {/* ponytail: raw <img> — data: URL from qrcode.toDataURL(). next/image doesn't support data: URLs. */}
      <img src={qrDataUrl} alt="Referral QR" className="rounded-xl border border-white/20" width={180} height={180} />
      <p className="text-[10px] text-muted-foreground">امسح للمشاركة</p>
    </div>
  )
}
