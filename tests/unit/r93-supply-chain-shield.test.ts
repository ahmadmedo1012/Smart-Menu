/**
 * r93-W3 — عقد تكوين درع سلسلة التوريد (F1/CRIT من تقرير 1-f §2).
 *
 * الدرس: المفتاح minimumReleaseAge فُقد مرة من pnpm-workspace.yaml أثناء
 * تخريب جلسة r92 فانطفأ الدرع بصمت — قائمة minimumReleaseAgeExclude بقيت
 * «أجوفة» (لا استبعادات فعلية بعد فقد البوابة نفسها) وقُبلت تجريبيًا حزمة
 * عمرها 75 دقيقة. إعادة W2-b للدرع موثقة بثلاثة أدلة (config=1440 ·
 * dry-run سليم · رفض حزمة فتية في اختبار محكوم) — هذا الملف يمنع فقدانه
 * مرة ثانية: أي حذف/تعطيل للبوابة يكسر عقد التكوين فورًا (حتى لو بقيت
 * القائمة والتعليقات كما هي — التعليق وحده لا يحمي).
 *
 * العقد (نص خام بلا محلل YAML — بلا تبعيات جديدة):
 *   - مفتاح minimumReleaseAge قائم (عمود 0 = جذر المستند) وقيمته 1440
 *     (24 ساعة — قيمة r86/r90/r93 الموثقة في الملف نفسه)
 *   - overrides فعّالة: zod مثبت (4.3.6 → 4.6.7 في P26-C لأمان GHSA-mrhx-c7xc-m3w5؛
 *     الجولة) · الاستثناء المعلن hono@4.13.3 باقٍ في قائمة الاستبعاد
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WORKSPACE_YAML = readFileSync(
        fileURLToPath(new URL('../../pnpm-workspace.yaml', import.meta.url)),
        'utf8'
);

describe('r93-W3 — درع سلسلة التوريد (pnpm-workspace.yaml)', () => {
        it('minimumReleaseAge: 1440 قائم كمفتاح جذر فعّال (غير معلَّق — فقد مرة!)', () => {
                // عمود 0 = مفتاح جذر في YAML؛ تعليقه أو إزاحته أو حذفه يكسر هذا العقد
                expect(WORKSPACE_YAML).toMatch(/^minimumReleaseAge:\s*1440\s*$/m);
                // قيمة 1440 موثقة نصًّا في الملف (24 ساعة) — لا قيمة أخرى مقبولة
                const m = WORKSPACE_YAML.match(/^minimumReleaseAge:\s*(\d+)\s*$/m);
                expect(m?.[1]).toBe('1440');
        });

        it('قائمة الاستبعاد النشطة باقية كما وُثقت (hono@4.13.3 الاستثناء المعلن الوحيد)', () => {
                // الدرع مفعّل ⇒ القائمة فعّالة (r93-W2b) — استثناء r86 محفوظ
                expect(WORKSPACE_YAML).toMatch(/^minimumReleaseAgeExclude:\s*$/m);
                expect(WORKSPACE_YAML).toMatch(/^\s+-\s+hono@4\.13\.3\s*$/m);
        });

        it('overrides لم تكسر: zod مثبت على 4.6.7 (دُفِع 4.3.6 → 4.6.7 في P26-C)', () => {
                // section موجود فعّالًا + تثبيت zod — قائمة «لا تلمس» الأصلية كانت 4.3.6؛
                // P26-C رفعتها إلى 4.6.7 ل retiring GHSA-mrhx-c7xc-m3w5 (استنزاف الذاكرة
                // في المجموعات المقيّدة الضخمة — نفس الثغرة التي أقفلتها SmartBot في 2d40900).
                // الدرع يقفل القيمة الجديدة بنفس الصرامة: أي ترقية عرضية بعيدًا عن موثّق
                // أمني تعطّل الاختبار.
                expect(WORKSPACE_YAML).toMatch(/^overrides:\s*$/m);
                expect(WORKSPACE_YAML).toMatch(/^\s+zod:\s*4\.6\.7\s*$/m);
        });
});
