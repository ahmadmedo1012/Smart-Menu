import type { Metadata } from "next"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { ThemeToggle } from "@/components/shared/ThemeToggle"

export const metadata: Metadata = {
	title: "سياسة الخصوصية",
}

export default function PrivacyPage() {
	return (
		<div className="min-h-screen bg-background">
			<Header />
			<div className="fixed right-4 top-4 z-50">
				<ThemeToggle />
			</div>
			<div className="max-w-3xl mx-auto px-4 py-20">
				<h1 className="text-3xl font-bold mb-8">سياسة الخصوصية</h1>
				<div className="space-y-6 text-foreground/80">
					<p>نحن في الربط الذكي | Smart Menu نلتزم بحماية خصوصيتك. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك الشخصية.</p>
					<h2 className="text-foreground text-xl font-semibold mt-8">المعلومات التي نجمعها</h2>
					<ul className="list-disc pr-5 space-y-2">
						<li>معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف</li>
						<li>بيانات المطعم: اسم المطعم، الشعار، العنوان، ساعات العمل</li>
						<li>قائمة الطعام: الأصناف، الأسعار، الوصف، الصور</li>
						<li>بيانات الطلبات: سجل الطلبات، الإحصائيات</li>
					</ul>
					<h2 className="text-foreground text-xl font-semibold mt-8">كيف نستخدم معلوماتك</h2>
					<ul className="list-disc pr-5 space-y-2">
						<li>تقديم وتحسين خدمة المنيو الرقمي</li>
						<li>معالجة الطلبات والتواصل مع العملاء</li>
						<li>تحليل الأداء وإرسال التقارير</li>
						<li>التواصل معك بخصوص حسابك وخدمتنا</li>
					</ul>
					<h2 className="text-foreground text-xl font-semibold mt-8">حماية البيانات</h2>
					<p>نستخدم إجراءات أمنية متقدمة لحماية بياناتك من الوصول غير المصرح به أو التعديل أو الإفشاء.</p>
					<h2 className="text-foreground text-xl font-semibold mt-8">جهات خارجية</h2>
					<p>لا نشارك معلوماتك مع أطراف ثالثة إلا للضرورة القصوى (مثل بوابات الدفع) ووفقاً لمعايير أمان صارمة.</p>
					<h2 className="text-foreground text-xl font-semibold mt-8">اتصل بنا</h2>
					<p>للاستفسارات المتعلقة بالخصوصية، يرجى التواصل عبر واتساب أو البريد الإلكتروني المسجل.</p>
					<p className="text-sm mt-12">آخر تحديث: يونيو 2026</p>
				</div>
			</div>
			<Footer />
		</div>
	)
}
