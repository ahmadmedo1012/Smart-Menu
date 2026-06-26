"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QrCode, Copy, Check, Download, Store, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Restaurant {
  id: number; name: string; slug: string;
}

const QR_SIZES = [
  { value: 200, label: "صغير" },
  { value: 300, label: "متوسط" },
  { value: 500, label: "كبير" },
  { value: 1000, label: "طباعة" },
];

export default function AdminQRPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrSize, setQrSize] = useState(300);

  useEffect(() => {
    fetch("/api/restaurants")
      .then(r => r.json())
      .then(json => {
        const list = json.data?.restaurants ?? [];
        setRestaurants(list);
        if (list.length > 0) {
          setSelectedSlug(list[0].slug);
          setSelectedName(list[0].name);
        }
      })
      .catch(() => toast.error("فشل تحميل المطاعم"));
  }, []);

  const menuUrl = selectedSlug
    ? `${window.location.origin}/menu/${selectedSlug}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(menuUrl).then(() => {
      setCopied(true);
      toast.success("تم نسخ الرابط");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(menuUrl)}&format=png&bgcolor=ffffff&color=d97706`;
    link.download = `qr-${selectedSlug}-${qrSize}.png`;
    link.target = "_blank";
    link.click();
    toast.success("جاري تحميل رمز QR");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-2xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg">
          <QrCode className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">رمز QR</h2>
          <p className="text-sm text-muted-foreground">إنشاء رمز QR لكل مطعم</p>
        </div>
      </div>

      <div className="rounded-2xl bg-card/50 border border-border/30 overflow-hidden">
        {/* Restaurant selector */}
        <div className="p-5 space-y-4">
          <div>
            <Label>اختر المطعم</Label>
            <div className="flex gap-2 mt-1.5">
              {restaurants.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setSelectedSlug(r.slug); setSelectedName(r.name); }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    selectedSlug === r.slug
                      ? "bg-orange-muted border-orange/30 text-orange"
                      : "border-border/30 hover:border-orange/30"
                  )}
                >
                  <Store className="size-4" />
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code display */}
          {menuUrl && (
            <div className="flex justify-center py-6 bg-white/30 dark:bg-white/5 rounded-xl">
              <div className="relative group">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(menuUrl)}&format=png&bgcolor=ffffff&color=d97706`}
                  alt={`QR - ${selectedName}`}
                  className="rounded-xl shadow-lg transition-all group-hover:shadow-xl"
                  style={{ width: qrSize, height: qrSize, maxWidth: "100%" }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="size-10 md:size-14 rounded-2xl bg-card/90 shadow flex items-center justify-center">
                    <Store className="size-5 md:size-7 text-orange" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Size selector */}
          <div>
            <Label className="text-xs text-muted-foreground">الحجم</Label>
            <div className="flex gap-2 mt-1.5">
              {QR_SIZES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setQrSize(s.value)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    qrSize === s.value
                      ? "bg-orange-muted border-orange/30 text-orange"
                      : "border-border/30 hover:border-orange/30"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* URL + Actions */}
          <div>
            <Label className="text-xs text-muted-foreground">الرابط</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={menuUrl} readOnly dir="ltr" className="text-sm h-11 rounded-xl" />
              <Button variant="outline" size="icon" aria-label="نسخ الرابط" onClick={copyLink} className="size-11 rounded-xl shrink-0">
                {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              </Button>
              <a href={menuUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" aria-label="فتح الرابط" className="size-11 rounded-xl shrink-0">
                  <ExternalLink className="size-4" />
                </Button>
              </a>
            </div>
          </div>

          <Button onClick={downloadQR} className="w-full h-12 rounded-xl gap-2">
            <Download className="size-4" />
            تحميل رمز QR ({qrSize}x{qrSize})
          </Button>
        </div>
      </div>
    </div>
  );
}
