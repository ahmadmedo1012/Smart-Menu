"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Reveal from "./Reveal";

export default function CTASection() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <Reveal animation="animate-scale-in">
          <div className="max-w-4xl mx-auto rounded-3xl border bg-card p-12 text-center shadow-sm">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-balance">مستعد لانطلاق مطعمك الرقمي؟</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              انضم إلى عشرات المطاعم والمقاهي. استقبل الطلبات عبر واتساب بدون وسيط.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/subscribe">
                <Button className="bg-gold text-gold-foreground hover:opacity-90 px-10 h-14 shadow-lg shadow-gold/20" size="lg">
                  ابدأ مجاناً الآن <ArrowLeft className="ms-2 size-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="px-10 h-14 border-2">
                  عرض الخطط
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-5">مجاناً بدون بطاقة ائتمان • إلغاء في أي وقت</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
