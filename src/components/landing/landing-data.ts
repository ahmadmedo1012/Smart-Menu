import { Smartphone, MessageCircle, QrCode, BarChart3, Gift, Shield, UserPlus, UtensilsCrossed, Share2, LayoutDashboard, Monitor, type LucideIcon } from "lucide-react";

export type Benefit = { icon: LucideIcon; title: string; desc: string; gradient: string };
export type Partner = { name: string; slug: string; desc: string };
export type Stat = { icon: LucideIcon; value: number; suffix?: string; label: string; decimals?: number };
export type Step = { title: string; desc: string; icon: LucideIcon };
export type PricingPlan = { name: string; price: string; period: string; features: string[]; cta: string; popular: boolean; gradient: string };
export type Showcase = { title: string; desc: string; icon: LucideIcon };
export type Testimonial = { name: string; role: string; content: string; rating: number };

export type PublicStats = {
  totalRestaurants: number;
  totalUsers: number;
};

export async function fetchPublicStats(): Promise<PublicStats> {
  try {
    const res = await fetch("/api/public/stats");
    if (!res.ok) throw new Error("Stats unavailable");
    return await res.json();
  } catch {
    return { totalRestaurants: 0, totalUsers: 0 };
  }
}

export const BENEFITS: Benefit[] = [
  { icon: Smartphone, title: "منيو رقمي تفاعلي", desc: "قائمة طعام رقمية مع صور وأسعار وتفاصيل. محدثة بشكل لحظي دون طباعة.", gradient: "from-orange to-orange/80" },
  { icon: MessageCircle, title: "طلب عبر واتساب", desc: "يصل الطلب مباشرة إلى واتساب المطعم مع تفاصيل كاملة وجاهزة للتحضير.", gradient: "from-orange to-orange/80" },
  { icon: QrCode, title: "QR كود مخصص", desc: "رمز QR خاص لمطعمك للطباعة على الطاولات والفواتير والمواد الدعائية.", gradient: "from-orange to-orange/80" },
  { icon: BarChart3, title: "إحصائيات وتحليلات", desc: "تقارير مفصلة عن الطلبات والأصناف الأكثر طلباً وسلوك الزبائن.", gradient: "from-orange to-orange/80" },
  { icon: Gift, title: "برنامج ولاء", desc: "نظام نقاط ومكافآت يحفز الزبائن على العودة ويزيد ارتباطهم بمطعمك.", gradient: "from-orange to-orange/80" },
  { icon: Shield, title: "تحكم كامل", desc: "لوحة تحكم متكاملة لإدارة المنيو والطلبات والموظفين والإعدادات.", gradient: "from-orange to-orange/80" },
];

export const PARTNERS: Partner[] = [
  { name: "مقهى الواحة", slug: "al-waha-cafe", desc: "مشروبات وحلويات" },
  { name: "مطعم الأصيل", slug: "al-aseel", desc: "مأكولات ليبية تقليدية" },
  { name: "بيتزا روما", slug: "pizza-roma", desc: "بيتزا إيطالية طازجة" },
];

export const STEPS: Step[] = [
  { title: "1. سجل مطعمك", desc: "أدخل بيانات مطعمك في دقائق وأنشئ حساباً مجاناً", icon: UserPlus },
  { title: "2. أضف المنيو", desc: "أضف الأصناف والفئات والأسعار والصور بسهولة", icon: UtensilsCrossed },
  { title: "3. شارك الرابط", desc: "شارك رابط المنيو مع زبائنك وابدأ باستقبال الطلبات", icon: Share2 },
];

export const PRICING_PLANS: PricingPlan[] = [
  { name: "مجاني", price: "0", period: "دائماً", features: ["منيو رقمي تفاعلي", "10 أصناف", "طلبات واتساب", "إحصائيات أساسية"], cta: "ابدأ مجاناً", popular: false, gradient: "from-orange to-orange/80" },
  { name: "المدفوعة", price: "29", period: "شهرياً", features: ["جميع ميزات المجانية", "أصناف غير محدودة", "برنامج ولاء متكامل", "QR كود مخصص", "إحصائيات متقدمة", "دعم فني فوري", "تخصيص كامل"], cta: "اشترك الآن", popular: true, gradient: "from-orange to-orange/80" },
];

export const SHOWCASES: Showcase[] = [
  { title: "منيو رقمي أنيق", desc: "قائمة طعام بتصميم جذاب تعرض أصنافك بأفضل صورة", icon: Smartphone },
  { title: "طلبات لحظية", desc: "الطلبات تصل مباشرة لواتساب المطعم مع تفاصيل كاملة", icon: MessageCircle },
  { title: "لوحة تحكم متكاملة", desc: "إدارة المطاعم والمنيو والطلبات والإحصائيات من مكان واحد", icon: LayoutDashboard },
  { title: "يعمل على جميع الشاشات", desc: "تجربة مثالية على الجوال والتابلت والحاسوب", icon: Monitor },
];

export const TESTIMONIALS: Testimonial[] = [
  { name: "أحمد المبروك", role: "صاحب مقهى الواحة", content: "منذ استخدام الربط الذكي، زادت طلباتنا عبر واتساب. الزبائن صاروا يطلبون مباشرة من المنيو دون الاتصال بنا.", rating: 5 },
  { name: "سارة التومي", role: "مديرة مطعم الأصيل", content: "وفرت لنا المنصة وقتاً وجهداً. تحديث المنيو يتم لحظياً والطلبات تصل مرتبة. أنصح بها كل مطعم.", rating: 5 },
  { name: "عمر بن عاشور", role: "صاحب بيتزا روما", content: "نظام الولاء والنقاط جعل الزبائن يعودون باستمرار. زيادة واضحة في المبيعات الشهرية.", rating: 5 },
];
