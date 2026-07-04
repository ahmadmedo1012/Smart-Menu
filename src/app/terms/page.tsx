import type { Metadata } from "next"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"

export const metadata: Metadata = {
	title: "شروط الاستخدام",
}

export default function TermsPage() {
	return (
		<div className="min-h-screen bg-background">
			<Header />
			<div className="max-w-3xl mx-auto px-4 py-20">
				<h1 className="text-3xl font-bold mb-8">شروط الاستخدام</h1>
				<div className="prose prose-invert space-y-6 text-foreground/80">
					<p>باستخدامك لمنصة الربط الذكي | Smart Menu، فإنك توافق على هذه الشروط. إذا كنت لا توافق، يرجى عدم استخدام الخدمة.</p>
					<h2 className="text-foreground text-xl font-semibold mt-8">المستخدم</h2>
					<p>عند إنشاء حساب في المنصة، أنت مسؤول عن الحفاظ على سرية معلومات الدخول الخاصة بك وعن جميع الأنشطة التي تتم تحت حسابك.</p>
					<h2 className="text-foreground text-xl font-semibold mt-8">الخدمة</h2>
					<p>توفر المنصة خدمة إدارة المنيو الرقمي واستقبال الطلبات عبر واتساب. نحن نبذل قصارى جهدنا لضمان استمرارية الخدمة، لكن لا نضمن عدم حدوث انقطاعات.</p>
					<h2 className="text-foreground text-xl font-semibold mt-8">المحتوى</h2>
					<p>أنت المسؤول الوحيد عن محتوى قائمتك (المنيو) وبيانات مطعمك. نحن لا نتحقق من دقة أو قانونية المحتوى المضاف.</p>
					<h2 className="text-foreground text-xl font-semibold mt-8">الدفع</h2>
					<p>المدفوعات تتم عبر بوابات دفع آمنة. نحن لا نخزن معلومات بطاقات الائتمان. جميع المبالغ غير قابلة للاسترداد إلا في حالات محدودة.</p>
					<h2 className="text-foreground text-xl font-semibold mt-8">تعديل الشروط</h2>
					<p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سنقوم بإشعارك بأي تغييرات جوهرية عبر البريد الإلكتروني المسجل لدينا.</p>
					<p className="text-sm mt-12">آخر تحديث: يونيو 2026</p>
				</div>
			</div>
			<Footer />
		</div>
	)
}
