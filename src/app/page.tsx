import Link from "next/link";
import {
  ArrowLeft,
  UtensilsCrossed,
  MessageCircle,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: UtensilsCrossed,
    title: "المنيو الذكي",
    desc: "قائمة طعام رقمية تفاعلية تعرض أصنافك بشكل احترافي مع صور وأسعار محدثة.",
  },
  {
    icon: MessageCircle,
    title: "طلبات واتساب",
    desc: "استقبل الطلبات مباشرة على واتساب مع تفاصيل كاملة وسهولة في المتابعة.",
  },
  {
    icon: LayoutDashboard,
    title: "لوحة التحكم",
    desc: "إدارة كاملة للمنيو والطلبات والإحصائيات من لوحة تحكم سهلة الاستخدام.",
  },
];

const steps = [
  { title: "أضف منيو مطعمك", desc: "قم بإضافة أصناف مطعمك مع الصور والأسعار والتصنيفات." },
  { title: "شارك الرابط", desc: "شارك رابط المنيو مع زبائنك عبر واتساب أو وسائل التواصل." },
  { title: "تصفح واختر", desc: "يتصفح الزبائن المنيو ويختارون ما يرغبون به بسهولة." },
  { title: "استقبل الطلب", desc: "يصل الطلب مباشرة إلى واتساب الخاص بمطعمك." },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <span className="text-xl font-bold">الربط الذكي</span>
          <Link href="/menu">
            <Button variant="outline" size="sm">القائمة</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/[0.03] via-transparent to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              الربط الذكي
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              نظام المنيو الذكي والطلبات عبر واتساب للمطاعم والمقاهي
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/menu">
                <Button size="lg" className="text-lg px-8 h-12">
                  اطلب الآن
                  <ArrowLeft className="mr-2 size-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">مميزات النظام</h2>
            <p className="text-lg text-muted-foreground">كل ما تحتاجه لإدارة طلبات مطعمك بذكاء</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className="rounded-xl bg-card p-8 ring-1 ring-foreground/10 animate-slide-up transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="size-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">كيف يعمل النظام؟</h2>
            <p className="text-lg text-muted-foreground">في أربع خطوات بسيطة</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div
                key={i}
                className="text-center animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">{i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="max-w-3xl mx-auto px-4 text-center animate-slide-up">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">ابدأ مع الربط الذكي اليوم</h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            حول منيو مطعمك إلى تجربة رقمية متكاملة واستقبل الطلبات بسهولة
          </p>
          <Link href="/menu">
            <Button size="lg" className="text-lg px-8 h-12">
              تصفح القائمة
              <ArrowLeft className="mr-2 size-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()} — الربط الذكي</p>
        </div>
      </footer>
    </div>
  );
}
