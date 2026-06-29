"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";


function FloatingShapes() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -top-20 -right-20 h-72 w-72 animate-spin-slow rounded-full bg-gradient-to-br from-orange/15 to-orange/5 blur-3xl dark:from-orange/10 dark:to-orange/5"
        style={{ animationDuration: "20s" }}
      />
      <div
        className="absolute -bottom-32 -left-32 h-96 w-96 animate-spin-slow rounded-full bg-gradient-to-tr from-orange/10 to-orange/5 blur-3xl dark:from-orange/8 dark:to-orange/5"
        style={{ animationDuration: "25s" }}
      />
      <div
        className="absolute left-1/3 top-1/4 h-48 w-48 animate-float-delayed rounded-full bg-gradient-to-b from-orange/15 to-transparent blur-2xl dark:from-orange/8"
        style={{ animationDelay: "1s", animationDuration: "8s" }}
      />
    </div>
  );
}

function LoginForm() {
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

      // ponytail: window.location.replace avoids router.push + router.refresh race
      // that causes blank screen in Next.js 16 App Router (rehydration mismatch)
      const target = data.user?.role === "owner" ? "/owner" : redirect;
      setTimeout(() => window.location.replace(target), 150);
    } catch {
      toast.error("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 sm:px-6">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-orange-muted/20 to-background dark:from-zinc-900 dark:via-zinc-900 dark:to-background" />

      <FloatingShapes />

      {/* Back to home + ThemeToggle */}
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground/60 hover:text-foreground">
            <ArrowRight className="size-3.5" />
            العودة للرئيسية
          </Button>
        </Link>
        <ThemeToggle />
      </div>

      {/* Decorative top bar */}
      <div className="fixed top-0 inset-x-0 z-10 h-1 bg-gradient-to-r from-orange via-orange/80 to-orange/60 dark:from-orange dark:via-orange/80 dark:to-orange/60" />

      <Card className="animate-scale-in relative z-10 w-full max-w-sm border border-orange/20 bg-card/80 shadow-2xl shadow-orange/5 backdrop-blur-2xl backdrop-saturate-150 sm:max-w-md sm:rounded-md dark:border-orange/10 dark:bg-card/80 dark:shadow-2xl dark:shadow-orange/10">
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
              <div className="glow-within rounded-lg border border-input/60 bg-background/50 transition-all duration-300">
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
              <div className="glow-within relative rounded-lg border border-input/60 bg-background/50 transition-all duration-300">
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
              variant="orange"
              className="magnetic-btn mt-2 h-10 w-full rounded-xl font-arabic text-base font-semibold"
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
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-orange-muted/20 to-background dark:from-zinc-900 dark:via-zinc-900 dark:to-background">
          <div className="flex flex-col items-center gap-3">
            <div className="size-10 animate-pulse rounded-full bg-orange/40" />
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
