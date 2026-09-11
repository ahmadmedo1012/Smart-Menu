import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function TermsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 22, fontWeight: "700", color: "#ebe7e2", marginBottom: 16 }}>الشروط والأحكام</Text>
        <Text style={{ fontFamily: "Cairo", fontSize: 14, color: "#ebe7e2", lineHeight: 22 }}>
          باستخدامك لتطبيق الربط الذكي | Smart Menu فإنك توافق على الشروط والأحكام التالية. يهدف التطبيق إلى توفير منصة رقمية لإدارة منيو المطاعم والمقاهي واستقبال الطلبات عبر واتساب. يتحمّل المستخدم مسؤولية صحة البيانات المُدخلة (مثل الاسم ورقم الهاتف) عند الطلب. لا يتحمّل التطبيق أي مسؤولية عن جودة المنتجات أو الخدمات المُقدمة من المطعم.
        </Text>
        <Text style={{ fontFamily: "Cairo", fontSize: 14, color: "#ebe7e2", lineHeight: 22, marginTop: 12 }}>
          يتم تحصيل اشتراكات المطاعم عبر قنوات الدفع المتاحة (ليبيانا موبايل / مدار / تحويل بنكي). الاشتراك صالح لمدة 30 يومًا من تاريخ التفعيل. يحق لإدارة التطبيق تعليق أو إنهاء الخدمة في حال مخالفة الشروط.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export function PrivacyScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#010000" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: "ReadexPro", fontSize: 22, fontWeight: "700", color: "#ebe7e2", marginBottom: 16 }}>سياسة الخصوصية</Text>
        <Text style={{ fontFamily: "Cairo", fontSize: 14, color: "#ebe7e2", lineHeight: 22 }}>
          نحترم خصوصيتك. نجمع الحد الأدنى من البيانات اللازمة لتقديم الخدمة (الاسم، رقم الهاتف، تفاصيل الطلب). لا نشارك بياناتك مع أي طرف ثالث لأغراض تسويقية. تُخزَّن البيانات بشكل آمن على خوادم موثوقة. يمكنك طلب حذف بياناتك في أي وقت بالتواصل مع الدعم.
        </Text>
        <Text style={{ fontFamily: "Cairo", fontSize: 14, color: "#ebe7e2", lineHeight: 22, marginTop: 12 }}>
          لا نخزّن بيانات الدفع البنكي داخل التطبيق. تتم عملية الدفع عبر قنوات خارجية (تحويل بنكي أو محفظة إلكترونية) ونحتفظ فقط بإيصال الدفع لأغراض التحقق.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
