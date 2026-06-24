"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { csrfFetch } from "@/lib/csrf-client";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import Image from "next/image"
import Link from "next/link";
import {
  LogIn,
  UtensilsCrossed,
  Pizza,
  Coffee,
  ChefHat,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

const foodIcons = [
  { Icon: UtensilsCrossed, x: "10%", y: "15%", size: 28, delay: "0s", duration: "6s" },
  { Icon: Pizza, x: "85%", y: "20%", size: 36, delay: "1s", duration: "7s" },
  { Icon: Coffee, x: "15%", y: "75%", size: 24, delay: "2s", duration: "5s" },
  { Icon: ChefHat, x: "80%", y: "80%", size: 32, delay: "0.5s", duration: "8s" },
  { Icon: UtensilsCrossed, x: "50%", y: "10%", size: 20, delay: "3s", duration: "6.5s" },
  { Icon: Pizza, x: "20%", y: "50%", size: 22, delay: "1.5s", duration: "7.5s" },
  { Icon: Coffee, x: "75%", y: "45%", size: 18, delay: "2.5s", duration: "5.5s" },
  { Icon: ChefHat, x: "45%", y: "85%", size: 26, delay: "0.8s", duration: "6.8s" },
];

function FloatingIcons() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {foodIcons.map(({ Icon, x, y, size, delay, duration }, i) => (
        <div
          key={i}
          className="absolute animate-float text-amber-200/30 dark:text-amber-400/15"
          style={{
            left: x,
            top: y,
            fontSize: size,
            animationDelay: delay,
            animationDuration: duration,
          }}
        >
          <Icon size={size} />
        </div>
      ))}
    </div>
  );
}

function FloatingShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -top-20 -right-20 h-72 w-72 animate-spin-slow rounded-full bg-gradient-to-br from-amber-300/20 to-amber-500/10 blur-3xl dark:from-amber-400/10 dark:to-amber-600/5"
        style={{ animationDuration: "20s" }}
      />
      <div
        className="absolute -bottom-32 -left-32 h-96 w-96 animate-spin-slow rounded-full bg-gradient-to-tr from-amber-400/15 to-amber-300/10 blur-3xl dark:from-amber-500/8 dark:to-amber-400/5"
        style={{ animationDuration: "25s" }}
      />
      <div
        className="absolute left-1/3 top-1/4 h-48 w-48 animate-float-delayed rounded-full bg-gradient-to-b from-amber-200/20 to-transparent blur-2xl dark:from-amber-400/8"
        style={{ animationDelay: "1s", animationDuration: "8s" }}
      />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await csrfFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "فشل تسجيل الدخول");
        return;
      }

      toast.success("تم تسجيل الدخول بنجاح");

      if (data.user?.role === "owner") {
        router.push("/owner");
      } else {
        router.push(redirect);
      }
      router.refresh();
    } catch {
      toast.error("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 sm:px-6">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-amber-50 via-amber-50/60 to-amber-100/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-amber-950/30" />

      <FloatingShapes />
      <FloatingIcons />

      {/* Back to home + ThemeToggle */}
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowRight className="size-4" />
            العودة للرئيسية
          </Button>
        </Link>
        <ThemeToggle />
      </div>

      {/* Decorative top bar */}
      <div className="fixed top-0 inset-x-0 z-10 h-1 bg-gradient-to-l from-amber-400 via-amber-500 to-amber-300 dark:from-amber-500 dark:via-amber-400 dark:to-amber-600" />

      <Card className="animate-scale-in relative z-10 w-full max-w-sm border-none bg-white/70 shadow-xl backdrop-blur-xl sm:max-w-md sm:rounded-2xl dark:bg-zinc-900/70 dark:shadow-2xl">
        {/* Logo area */}
        <CardHeader className="pb-2 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-full w-full object-contain" priority />
          </div>
          <CardTitle className="font-arabic text-2xl font-bold tracking-tight">
            الربط الذكي
          </CardTitle>
          <CardDescription className="font-arabic text-base text-muted-foreground/80">
            لوحة تحكم المطاعم
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8 pt-4 sm:px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-arabic text-sm font-medium">
                اسم المستخدم
              </Label>
              <div className="glow-within rounded-lg border border-input bg-background/50 transition-colors focus-within:border-amber-400 dark:focus-within:border-amber-500">
                <Input
                  id="username"
                  type="text"
                  dir="auto"
                  placeholder="اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-arabic text-sm font-medium">
                كلمة المرور
              </Label>
              <div className="glow-within relative rounded-lg border border-input bg-background/50 transition-colors focus-within:border-amber-400 dark:focus-within:border-amber-500">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  dir="auto"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-0 bg-transparent pr-9 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="magnetic-btn mt-2 h-10 w-full rounded-xl bg-gradient-to-l from-amber-500 to-amber-600 font-arabic text-base font-semibold text-white shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-amber-700 hover:shadow-amber-500/40 disabled:opacity-60 dark:from-amber-400 dark:to-amber-500 dark:text-zinc-900 dark:shadow-amber-400/25 dark:hover:from-amber-500 dark:hover:to-amber-600"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LogIn className="size-4 animate-pulse" />
                  جاري تسجيل الدخول...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="size-4" />
                  تسجيل الدخول
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-muted-foreground/60 font-arabic">
            نظام إدارة المطاعم — الربط الذكي
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-amber-50/60 to-amber-100/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-amber-950/30">
          <div className="flex flex-col items-center gap-3">
            <div className="size-10 animate-pulse rounded-full bg-amber-400/40" />
            <span className="animate-breath font-arabic text-sm text-muted-foreground">
              جاري التحميل...
            </span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
