import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";

export function TermsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 22, fontWeight: "700", color: colors.sand, marginBottom: 16 }}>الشروط والأحكام</Text>
        {/* r130 W2-4: legal PROSE rides the canonical body rung — --fs-body
            15px × --lh-base 1.65 = 24.75 (tokens.css:76,108; web twin terms
            page rides the same 15/1.65 body). Was 14/22. */}
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 15, color: colors.sand, lineHeight: 24.75 }}>
          باستخدامك لتطبيق الربط الذكي | Smart Menu فإنك توافق على الشروط والأحكام التالية. يهدف التطبيق إلى توفير منصة رقمية لإدارة منيو المطاعم والمقاهي واستقبال الطلبات عبر واتساب. يتحمّل المستخدم مسؤولية صحة البيانات المُدخلة (مثل الاسم ورقم الهاتف) عند الطلب. لا يتحمّل التطبيق أي مسؤولية عن جودة المنتجات أو الخدمات المُقدمة من المطعم.
        </Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 15, color: colors.sand, lineHeight: 24.75, marginTop: 12 }}>
          يتم تحصيل اشتراكات المطاعم عبر قنوات الدفع المتاحة (ليبيانا موبايل / مدار / تحويل بنكي). الاشتراك صالح لمدة 30 يومًا من تاريخ التفعيل. يحق لإدارة التطبيق تعليق أو إنهاء الخدمة في حال مخالفة الشروط.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export function PrivacyScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.night }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 22, fontWeight: "700", color: colors.sand, marginBottom: 16 }}>سياسة الخصوصية</Text>
        {/* r130 W2-4: body rung 15/1.65 (= 24.75) — see TermsScreen note. */}
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 15, color: colors.sand, lineHeight: 24.75 }}>
          نحترم خصوصيتك. نجمع الحد الأدنى من البيانات اللازمة لتقديم الخدمة (الاسم، رقم الهاتف، تفاصيل الطلب). لا نشارك بياناتك مع أي طرف ثالث لأغراض تسويقية. تُخزَّن البيانات بشكل آمن على خوادم موثوقة. يمكنك طلب حذف بياناتك في أي وقت بالتواصل مع الدعم.
        </Text>
        <Text style={{ fontFamily: "IBM Plex Sans Arabic", fontSize: 15, color: colors.sand, lineHeight: 24.75, marginTop: 12 }}>
          لا نخزّن بيانات الدفع البنكي داخل التطبيق. تتم عملية الدفع عبر قنوات خارجية (تحويل بنكي أو محفظة إلكترونية) ونحتفظ فقط بإيصال الدفع لأغراض التحقق.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
