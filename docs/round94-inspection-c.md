# تقرير التفتيش C — الجولة 94 (المهمة 2-c: جودة كود عميقة)

> الوكيل: C · خط الأساس: `aec233ba` · التاريخ: 2026-09-08 · الطبيعة: **بحث فقط — لا تعديل في الكود**.
> النطاق: (1) خطة تفكيك `ItemDialog.tsx` قابلة للتنفيذ حرفياً · (2) جرد الكود الضخم/الميت/الدائري.

---

## فهرس

1. [الملخص التنفيذي](#1-الملخص-التنفيذي)
2. [القسم الأول — خطة تفكيك ItemDialog](#2-القسم-الأول--خطة-تفكيك-itemdialog)
   - 2.1 خريطة الملف الحالية (بأرقام الأسطر)
   - 2.2 عيوب مكتشفة أثناء الخريطة
   - 2.3 البنية المستهدفة (شجرة الملفات)
   - 2.4 حدود القصّ الدقيقة (سطر ← ملف)
   - 2.5 عقود الـprops/hooks كاملة (TypeScript)
   - 2.6 الحالة المشتركة: الأب مقابل الـhooks
   - 2.7 سجل المخاطر
   - 2.8 الاختبارات الحامية للسلوك (جرد دقيق)
   - 2.9 خطة النقل الآمن (خطوات مرقمة)
   - 2.10 اختبارات جديدة مقترحة (سد الفجوات)
3. [القسم الثاني — جرد جودة الكود](#3-القسم-الثاني--جرد-جودة-الكود)
   - 3.1 أكبر 10 ملفات في src/ + تقييم
   - 3.2 TODO/FIXME/HACK/XXX
   - 3.3 الكود الميت (knip)
   - 3.4 التبعيات الدائرية
4. [التوصيات الختامية بالأولويات](#4-التوصيات-الختامية)

---

## 1. الملخص التنفيذي

- **ItemDialog.tsx = 982 سطراً** (وُجد فعلياً 983 سطرًا؛ الأخير فارغ). الملف يجمع 5 مجالات مستقلة (حقول أساسية، صورة+رفع، محرر مجموعات المعدِّلات، قسم التمييز، شارات الطعام/الحساسية) في مكوّن واحد بحالة 5 شرائح `useState` و`useEffect` واحد (إعادة الضبط عند الفتح) ودالة حفظ 85 سطراً. **الخطة المقترحة: 13 ملفاً جديداً + إعادة كتابة المنظِّم، كل ملف ≤ ~150 سطراً** (القسم 2.3–2.9).
- وُجدت أثناء الخريطة **عيوب كامنة** (لا تكسر شيئاً اليوم): 4 معرّفات `id` حرفية معطوبة (سطور 594/854/909/941 — تُطبع كما هي `` `${fId}-status` `` بدل القيمة المُقيَّمة)، و**سباق إغلاق قديم (stale closure)** في ردّ رفع الصورة غير المتزامن (سطر 569 يطمس تعديلاتٍ متزامنة للمستخدم) — كلاهما مُعالَج داخل الخطة.
- **التغطية**: لا يوجد أي اختبار unit يُشغِّل `ItemDialog` نفسه؛ الحماية الفعلية = 6 ملفات e2e (أقواها `team11-modifiers` و`team8-featured`) + اختبارات unit على ساقي الـAPI. الخطة تُجمّد كل محددات e2e وتضيف اختبار unit جديداً للدوال النقية المستخرجة.
- **جودة عامة**: صفر TODO/FIXME/HACK/XXX حقيقية في src/ · **صفر تبعيات دائرية** عبر 418 ملف TS · knip: 21 ملفاً غير مستخدم (سكربتات جولاتٍ قديمة — advisory بحسب منهجية r90-F6) + 48 ملفاً بصدارات/أنواع غير مستوردة (54 صادرات + 45 أنواع، أغلبها kit shadcn كامل ومقصود).
- أكبر ملفات src/ بعد ItemDialog: `SubscribeForm` (604) و`PaymentDialog` (598) و`OrderDialog` (585) — مرشّحون طبيعيون لموجة التفكيك الثانية بنفس النمط.

---

## 2. القسم الأول — خطة تفكيك ItemDialog

الملف: `/home/z/my-project/src/components/owner/ItemDialog.tsx` — قرئ **بالكامل** سطراً سطراً. مواقع الاستيراد له (يجب ألا تتغير واجهتها):
- `src/app/(protected)/owner/menu/page.tsx:19` — استيراد قيمة `ItemDialog` (المستهلك الوحيد).
- `src/app/(protected)/owner/menu/types.ts:16` — استيراد نوع `ItemModifierGroup` من نفس المسار.
- `src/app/api/items/route.ts:103` و`src/app/api/items/[id]/route.ts:27,128` — **تعليقات فقط** تشير للعقد (POST ينشئ المجموعات nested، PUT يستبدل deleteMany+create) — لا استيراد.

### 2.1 خريطة الملف الحالية (بأرقام الأسطر)

#### أ) رأس الملف والأنواع على مستوى الوحدة (سطور 1–159)

| الأسطر | المحتوى | ملاحظات |
|---|---|---|
| 1–24 | `'use client'` + الاستيرادات | React، dietary (5 ثوابت)، lucide (4 أيقونات)، AnimatedUpload، Button/Input/Label/Textarea/Dialog، premiumToast، cn، OptimizedImage، Switch، SparklesIcon، csrfFetch، compressImage، toArabicNumber |
| 26–46 | `interface Item` (غير مُصدَّرة!) | 16 حقلاً — عقد الحوار مع الأب |
| 48–56 | `export type ItemModifierOption` | شكل GET /api/items المتسلسل |
| 57–66 | `export type ItemModifierGroup` | مستورَد من `owner/menu/types.ts` |
| 68–77 | `type OptionDraft` (خاصة) | مسوّدة تحرير بخانات رقمية-نصية |
| 78–88 | `type GroupDraft` (خاصة) | كذلك |
| 90–91 | `MAX_MODIFIER_GROUPS = 6`، `MAX_OPTIONS_PER_GROUP = 20` | حدود واجهة (مطابقة لحدود zod في API) |
| 94–110 | `export type ModifierGroupPayload` | عقد POST/PUT الدقيق |
| 112–116 | `draftSeq` (عداد وحدة) + `nextDraftKey()` | مفاتيح مسوّدات فريدة عبر كل نسخ الحوار |
| 118–138 | `groupsFromItem()` | تحويل العنصر ← مسوّدات |
| 142–157 | `initForm(catId)` | مصنع النموذج الفارغ (14 حقلاً) |
| 159 | `IMAGE_URL_RE` | `/^(https?:\/\/\|data:image\/)/i` |

#### ب) داخل المكوّن — الحالة والمعالجات (سطور 162–444)

| الأسطر | المحتوى | ملاحظات |
|---|---|---|
| 162–174 | `export function ItemDialog({...})` | الـprops: `open, onOpenChange, editing, categoryId, onSaved` |
| 176 | `const fId = useId()` | round86-C9 — ربط label↔control لـaxe |
| 177 | `useState(initForm(0))` → `form` | **شريحة 1**: النموذج كله |
| 178 | `useState(false)` → `saving` | **شريحة 2** |
| 179 | `useState(false)` → `uploading` | **شريحة 3** |
| 180 | `useState('')` → `badgeDraft` | **شريحة 4**: مسوّدة شارة نصية |
| 182 | `useState<GroupDraft[]>([])` → `groups` | **شريحة 5**: محرر المعدِّلات |
| 184–193 | `addBadge()` | قصّ+تقليم+حد 3+منع تكرار → `showcaseTags` |
| 196–214 | `addGroup()` | حد 6 مجموعات + toast خطأ عربي |
| 216–218 | `updateGroup(key, patch)` | تعديل جزئي بالمفتاح |
| 220–222 | `removeGroup(key)` | حذف بالتصفية |
| 224–248 | `addOption(groupKey)` | حد 20 خياراً + toast |
| 250–263 | `updateOption(groupKey, optionKey, patch)` | تعديل خيار |
| 265–273 | `removeOption(groupKey, optionKey)` | حذف خيار |
| 275–330 | `buildModifierGroupsPayload()` | **التحقق + التحويل**: اسم عربي مطلوب، حدود 0–10 صحيحة، min≤max، سعر الخيار finite → `ModifierGroupPayload[]` أو `null` + toast عربي بالسبب |
| 332–358 | `useEffect` إعادة الضبط | deps `[open, editing, categoryId]` — عند الفتح: `setBadgeDraft('')` ثم `setGroups(groupsFromItem(editing?.modifierGroups))` ثم `setForm(editing ? {...14 حقلاً} : initForm(categoryId))` |
| 360–444 | `save()` (85 سطراً) | الحراسة `if (saving) return` → تحقق name/price → IMAGE_URL_RE → featuredRank 1–5 → `buildModifierGroupsPayload` → جسم الطلب (سطور 383–415 وفيها **دلالات round88-C**: `featuredRank/showcaseTags` تُرسل فقط عند التمييز، و`modifierGroups: groups.length > 0 ? payload : []` — إرسال `[]` صراحةً يمحو المخزّن) → `csrfFetch` PUT/POST → رسائل خطأ مع تفاصيل → toast نجاح → إغلاق → `onSaved()` → `finally setSaving(false)` |

#### ج) JSX (سطور 446–981) — 12 قسماً

| الأسطر | القسم | تفاصيل مُجمَّدة (محددات اختبار) |
|---|---|---|
| 447–451 | Dialog + العنوان | `DialogContent className="max-w-lg rounded-md"`؛ العنوان «تعديل صنف»/«إضافة صنف» (e2e: team11/team8/r93-sim) |
| 452 | وعاء التمرير | `space-y-4 max-h-[60vh] overflow-y-auto` |
| 453–477 | شبكة الاسم/الاسم بالإنجليزية | ids `${fId}-name`, `${fId}-name-ar`، placeholder «كابتشينو» |
| 478–502 | شبكة الوصفين | `${fId}-desc`, `${fId}-desc-ar`، rows=2، `dir="ltr"` للإنجليزية |
| 503–531 | شبكة السعر/سعر الخصم | `${fId}-price` (type=number, min=0, step=0.5)، `${fId}-disc-price`، placeholder «اختياري» |
| 532–592 | حقل الصورة + الرفع + المعاينة | `${fId}-image`؛ **معالج رفع غير متزامن مضمّن (553–576)**: compressImage → FormData → `csrfFetch('/api/upload')` → `setForm({...form, image: d.data.url})` (⚠️ إغلاق قديم)؛ معاينة `OptimizedImage` بـ`size-20` (round88-A2) |
| 593–614 | حالة متوفر/غير متوفر | زران بـ`aria` ضمني؛ span بـid معطوب (594) |
| 616–638 | رأس قسم المعدِّلات + زر «إضافة مجموعة» | `aria-label="إضافة مجموعة خيارات"` (team11) |
| 639–643 | حالة فراغ القسم | نص إرشادي |
| 644–654 | حلقة `groups.map` | `fieldset` بـ`aria-label="مجموعة الخيارات رقم ١"` (team11: `fieldset[aria-label=...]`) |
| 646–663 | رأس المجموعة + «حذف المجموعة» | `aria-label="حذف مجموعة ${g.nameAr \|\| gi+1}"` (team11: `حذف مجموعة الحجم`) |
| 664–688 | اسم المجموعة (عربي/إنجليزي) | `${fId}-gname-${g.key}`، placeholder «الحجم» (team11) |
| 689–734 | الحد الأدنى/الأقصى/الترتيب/إلزامية | Labels «الحد الأدنى»/«الحد الأقصى» (team11: getByLabel)، Switch `${fId}-greq-` |
| 735–742 | ترويسة الخيارات + حالة الفراغ | |
| 743–795 | صفوف الخيارات (خيار واحد) | الصف `div class="flex flex-wrap items-end gap-2 rounded-md border border-border/30 bg-background/60 p-2"` (**team11 يستهدف `div.flex-wrap.items-end` الأخير — بنية طبق الأصل إلزامية**)؛ Switch «متاح»؛ زر حذف |
| 796–805 | زر «إضافة خيار» | `aria-label="إضافة خيار إلى المجموعة رقم ١"` (team11) |
| 812–830 | مفتاح التمييز | **`id="item-featured-switch"` حرفي** (team8: `#item-featured-switch`) + نص «عرض في قسم الأصناف المميزة» (team8 يغطي النص أيضاً) |
| 831–847 | ترتيب الظهور (rank 1–5) | `${fId}-rank`، placeholder «تلقائي» |
| 848–901 | شارات العرض (حتى ٣) | Enter يضيف؛ زر «إضافة»؛ chips قابلة للنقر للحذف (round83 §2.3)؛ id معطوب (854) |
| 902–905 | إغلاق الشرط | `{form.isFeatured && ...}` |
| 907–937 | شارات الطعام (dietary) | أزرار toggle بـicon من `DIETARY_ICONS`؛ id معطوب (909) |
| 939–969 | مسببات الحساسية (allergens) | أزرار toggle بـAlertTriangle؛ id معطوب (941) |
| 971–978 | تذييل الحوار | «إلغاء» + «تحديث»/«إضافة» (team11: `getByRole("button", {name:"تحديث"})`)، `disabled={saving \|\| uploading}` |

### 2.2 عيوب مكتشفة أثناء الخريطة (توثيق — الإصلاح مُدمج في الخطة)

1. **معرّفات حرفية معطوبة** (سطور 594، 854، 909، 941): الصيغة `id={"`${fId}-status`"}` عبارة عن **سلسلة بعلامات اقتباس مزدوجة محتواها النص الحرفي** `` `${fId}-status` `` — أي أن `id` يُطبع حرفياً بالقوسين المعقوفين ولا يُقيَّم `fId`. لا شيء يشير إليها بـ`htmlFor`/`aria-labelledby` اليوم (الـspans ليست عناصر تحكم)، و`team8` يستهدف `#item-featured-switch` المكتوبة صحيحة — **فالخلل كامن بلا أثر وظيفي**. الإصلاق: `id={`${fId}-status`}` (خطوة 18 من خطة النقل).
2. **سباق إغلاق قديم في الرفع** (سطر 569): داخل `onChange` غير المتزامن يُنفَّذ `setForm({ ...form, image: d.data.url })` بـ`form` الملتقطة لحظة بدء الرفع — أي تعديل يكتبه المالك في حقول أخرى أثناء الرفع يُطمَس عند اكتماله. المعالجة داخل الخطة: `patch` يُنفَّذ بتحديث وظيفي `setForm(prev => ({...prev, ...p}))` — إصلاح صارم التحسين، لا يغيّر أي مسار متزامن (كل المسارات الأخرى ردود أحداث متزامنة بلا فرق قابل للرصد).
3. **تشويه تنسيق** (مثلاً 456–463, 536–544, 837–846): عناصر Input بمسافات بادئة عميقة شاذة — `prettier` على المجلد الجديد في خطوة 18.
4. **`interface Item` غير مُصدَّرة** بينما يلزم العقد — تصديرها ضمن `types.ts` الجديد (لا يكسر شيئاً؛ الاستيراد الوحيد للنوع من هذا الملف هو `ItemModifierGroup`).

### 2.3 البنية المستهدفة (شجرة الملفات)

```
src/components/owner/
├── ItemDialog.tsx                     ← المُنظِّم (يُعاد كتابته) — نفس المسار ونفس الـprops العامة (~150 سطراً)
└── item-dialog/                        ← مجلد جديد
    ├── types.ts                        ← الأنواع + الثوابت (~95)
    ├── modifier-draft-utils.ts         ← دوال نقية خالصة (بلا React) (~130)
    ├── use-modifier-groups.ts          ← hook حالة المعدِّلات (~140)
    ├── use-item-form.ts                ← hook حالة النموذج (~150)
    ├── use-image-upload.ts             ← hook الرفع (~75)
    ├── use-item-save.ts                ← hook الحفظ (~135)
    ├── ItemCoreFields.tsx              ← أسماء/أوصاف/أسعار/الحالة (~150)
    ├── ItemImageField.tsx              ← رابط الصورة + الرفع + المعاينة (~85)
    ├── ModifierGroupsEditor.tsx        ← قسم المعدِّلات (~110)
    ├── ModifierGroupCard.tsx           ← بطاقة مجموعة واحدة (~120)
    ├── ModifierOptionRow.tsx           ← صف خيار واحد (~75)
    ├── FeaturedShowcaseSection.tsx     ← التمييز + الترتيب + الشارات (~110)
    └── DietaryAllergensSection.tsx     ← شارات الطعام + الحساسية (~115)
```

**المجموع: 13 ملفاً جديداً + إعادة كتابة 1** — كل ملف ≤ ~150 سطراً. المساران الخارجيان (`owner/menu/page.tsx` و`owner/menu/types.ts`) **لا يُلمسان** بفضل إعادة تصدير الأنواع من `ItemDialog.tsx`.

### 2.4 حدود القصّ الدقيقة (أي أسطر تنتقل لأي ملف)

| الأسطر المصدر | الوجهة | طريقة النقل |
|---|---|---|
| 26–110 (كل الأنواع) + 90–91 (الثوابت) + 159 (`IMAGE_URL_RE`) | `types.ts` | نقل حرفي؛ إضافة `ItemFormState` + تصدير `OptionDraft`/`GroupDraft` |
| 112–116 (`draftSeq`, `nextDraftKey`) + 118–138 (`groupsFromItem`) | `modifier-draft-utils.ts` | نقل حرفي — يبقى العداد على **مستوى الوحدة** |
| 275–330 (`buildModifierGroupsPayload`) | `modifier-draft-utils.ts` | نقل مع **تحويل توقيعي واحد**: الإغلاق على `groups` يصبح معاملاً `groups: GroupDraft[]` |
| 142–157 (`initForm`) + 177 (حالة `form`) + 180 (`badgeDraft`) + 184–193 (`addBadge`) | `use-item-form.ts` | نقل حرفي؛ استخراج `removeBadge`/`toggleDietaryTag`/`toggleAllergen` من JSX (884–898, 911–935, 943–967)؛ `patch` بتحديث وظيفي |
| 179 (حالة `uploading`) + 553–576 (معالج الرفع المضمّن) | `use-image-upload.ts` | نقل الجسد؛ `setForm({...form, image})` تصبح استدعاء `onUploaded(url)` |
| 182 (حالة `groups`) + 196–273 (6 معالجات مسوّدة) | `use-modifier-groups.ts` | نقل حرفي؛ إضافة `reset(source)` و`buildPayload()` |
| 178 (`saving`) + 360–444 (`save`) | `use-item-save.ts` | نقل حرفي؛ الاعتماديات تمر كوسائط (2.5) |
| 453–531 + 593–614 | `ItemCoreFields.tsx` | JSX حرفي (شبكات الأسماء/الأوصاف/الأسعار + الحالة) |
| 532–592 (باستثناء جسد 553–576) | `ItemImageField.tsx` | JSX حرفي؛ onChange يستدعي `onUploadFile(file)` |
| 616–643 + 644–654 | `ModifierGroupsEditor.tsx` | JSX حرفي؛ الحلقة تستبدل محتوى الـfieldset بـ`<ModifierGroupCard/>` |
| 646–734 + 735–742 + 796–807 | `ModifierGroupCard.tsx` | JSX حرفي؛ صفوف الخيارات تستبدل بـ`<ModifierOptionRow/>` |
| 743–795 | `ModifierOptionRow.tsx` | JSX حرفي (بنية `div.flex-wrap.items-end` كما هي) |
| 812–905 | `FeaturedShowcaseSection.tsx` | JSX حرفي؛ `id="item-featured-switch"` يبقى حرفياً |
| 907–969 | `DietaryAllergensSection.tsx` | JSX حرفي؛ onClick يستدعي `onToggleDietary`/`onToggleAllergen` |
| 176 (`fId`) + 332–358 (`useEffect` الإعادة) + 447–451 + 452 + 970–978 + التوصيل | `ItemDialog.tsx` | يبقى في المنظِّم (إعادة كتابة، 2.5-أخيراً) |

> قاعدة القصّ الذهبية: **أي className أو id أو aria-label أو placeholder أو نصّ ظاهر يُنقل دون تحريف حرف واحد** — المحددات مُجمَّدة (2.7-خطر1).

### 2.5 عقود الـprops/hooks كاملة (TypeScript)

#### `item-dialog/types.ts`

```ts
/* منقول حرفياً من الأسطر 26–110 */
export interface Item {
        id: number;
        name: string;
        nameAr?: string;
        description: string;
        descriptionAr?: string;
        price: number;
        discountedPrice: number | null;
        image: string;
        status: string;
        categoryId: number;
        dietaryTags?: string[];
        allergens?: string[];
        isFeatured?: boolean;
        featuredRank?: number | null;
        showcaseTags?: string[] | null;
        modifierGroups?: ItemModifierGroup[];
}
export type ItemModifierOption = { id: number; nameAr: string; name: string; priceDelta: string | number; isAvailable: boolean; sortOrder: number };
export type ItemModifierGroup = { id: number; nameAr: string; name: string; minSelect: number; maxSelect: number; required: boolean; sortOrder: number; options: ItemModifierOption[] };
export type OptionDraft = { key: string; id?: number; nameAr: string; name: string; priceDelta: string; isAvailable: boolean; sortOrder: number };
export type GroupDraft = { key: string; id?: number; nameAr: string; name: string; minSelect: string; maxSelect: string; required: boolean; sortOrder: string; options: OptionDraft[] };
export type ModifierGroupPayload = {
        id?: number; nameAr: string; name?: string; minSelect: number; maxSelect: number;
        required: boolean; sortOrder: number;
        options: Array<{ id?: number; nameAr: string; name?: string; priceDelta: number; isAvailable: boolean; sortOrder: number }>;
};

/* الجديد: شكل حالة النموذج المشتق من initForm (142–157) */
export type ItemFormState = {
        name: string; nameAr: string; description: string; descriptionAr: string;
        price: number; discountedPrice: string; status: string; categoryId: number;
        image: string; dietaryTags: string[]; allergens: string[]; isFeatured: boolean;
        featuredRank: string; showcaseTags: string[];
};

export const MAX_MODIFIER_GROUPS = 6;          // من السطر 90
export const MAX_OPTIONS_PER_GROUP = 20;       // من السطر 91
export const IMAGE_URL_RE = /^(https?:\/\/|data:image\/)/i;  // من السطر 159
```

#### `item-dialog/modifier-draft-utils.ts` (نقية — بلا React)

```ts
import { premiumToast } from '@/lib/premium-toast';
import { toArabicNumber } from '@/lib/format';
import type { GroupDraft, ItemModifierGroup, ModifierGroupPayload } from './types';

export function nextDraftKey(prefix: string): string;                          // حرفي من 112–116
export function groupsFromItem(groups: ItemModifierGroup[] | undefined): GroupDraft[];  // حرفي من 118–138
/** حرفي من 275–330 مع تغيير وحيد: الإغلاق على حالة groups يصبح معاملاً. */
export function buildModifierGroupsPayload(groups: GroupDraft[]): ModifierGroupPayload[] | null;
```

#### `item-dialog/use-modifier-groups.ts`

```ts
'use client';
import { useState } from 'react';
import type { GroupDraft, ItemModifierGroup, ModifierGroupPayload, OptionDraft } from './types';
import { buildModifierGroupsPayload, groupsFromItem, nextDraftKey } from './modifier-draft-utils';
import { MAX_MODIFIER_GROUPS, MAX_OPTIONS_PER_GROUP } from './types';
import { premiumToast } from '@/lib/premium-toast';

export function useModifierGroups(): {
        groups: GroupDraft[];
        addGroup: () => void;                                              // حرفي من 196–214
        updateGroup: (key: string, patch: Partial<GroupDraft>) => void;     // 216–218
        removeGroup: (key: string) => void;                                // 220–222
        addOption: (groupKey: string) => void;                             // 224–248
        updateOption: (groupKey: string, optionKey: string, patch: Partial<OptionDraft>) => void;  // 250–263
        removeOption: (groupKey: string, optionKey: string) => void;       // 265–273
        reset: (source: ItemModifierGroup[] | undefined) => void;           // = setGroups(groupsFromItem(source)) من السطر 336
        buildPayload: () => ModifierGroupPayload[] | null;                  // = buildModifierGroupsPayload(groups) من السطر 279
};
```

#### `item-dialog/use-item-form.ts`

```ts
'use client';
import { useState } from 'react';
import type { Item, ItemFormState } from './types';

export function useItemForm(): {
        form: ItemFormState;
        /** setForm({ ...form, ...p }) لكن بتحديث وظيفي (إصلاح سباق الرفع 569) */
        patch: (p: Partial<ItemFormState>) => void;
        badgeDraft: string;
        setBadgeDraft: (v: string) => void;
        addBadge: () => void;                        // حرفي من 184–193
        removeBadge: (tag: string) => void;          // مستخرج من JSX 884–898
        toggleDietaryTag: (t: string) => void;       // مستخرج من JSX 911–935
        toggleAllergen: (t: string) => void;         // مستخرج من JSX 943–967
        /** من تأثير الإعادة 337–356: setBadgeDraft('') + setForm(editing?{...}:initForm(categoryId)) */
        reset: (editing: Item | null, categoryId: number) => void;
};
```

#### `item-dialog/use-image-upload.ts`

```ts
'use client';
import { useState } from 'react';
import { csrfFetch } from '@/lib/csrf-client';
import { compressImage } from '@/lib/image-compress';
import { premiumToast } from '@/lib/premium-toast';

export function useImageUpload(onUploaded: (url: string) => void): {
        uploading: boolean;
        /** جسد حرفي من 553–576: compressImage → FormData → csrfFetch('/api/upload') →
         *  onUploaded(d.data.url) — الاستبدال الوحيد: setForm({...form, image}) → onUploaded(url) */
        uploadFile: (file: File) => Promise<void>;
};
```

#### `item-dialog/use-item-save.ts`

```ts
'use client';
import { useState } from 'react';
import { csrfFetch } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';
import type { GroupDraft, Item, ItemFormState, ModifierGroupPayload } from './types';
import { IMAGE_URL_RE } from './types';

export interface UseItemSaveArgs {
        editing: Item | null;
        form: ItemFormState;
        groups: GroupDraft[];
        buildPayload: () => ModifierGroupPayload[] | null;   // من useModifierGroups
        onOpenChange: (o: boolean) => void;
        onSaved: () => void;
}

export function useItemSave(args: UseItemSaveArgs): {
        saving: boolean;
        /** حرفي من 360–444 (الحراسة، ترتيب التحقق، جسم الطلب 383–415 بدلالات round88-C،
         *  PUT /api/items/${id} أو POST /api/items، toasts، onOpenChange(false)، onSaved) */
        save: () => Promise<void>;
};
```

#### `item-dialog/ItemCoreFields.tsx`

```tsx
'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ItemFormState } from './types';

export function ItemCoreFields({ fId, form, patch }: {
        fId: string;
        form: ItemFormState;
        patch: (p: Partial<ItemFormState>) => void;
}) /* JSX: الأسطر 453–531 (الأسماء/الأوصاف/الأسعار) + 593–614 (الحالة) منقولة حرفياً؛
     كل onChange يصبح patch({ <field>: e.target.value }) بنفس القيم */
```

#### `item-dialog/ItemImageField.tsx`

```tsx
'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import AnimatedUpload from '@/components/ui/upload-icon';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

export function ItemImageField({ fId, image, uploading, onImageChange, onUploadFile }: {
        fId: string;
        image: string;
        uploading: boolean;
        onImageChange: (v: string) => void;            // patch({ image: v })
        onUploadFile: (file: File) => Promise<void>;   // useImageUpload().uploadFile
}) /* JSX: الأسطر 532–592 حرفياً؛ جسد onChange (553–576) يُستبدل بـ onUploadFile(file) */
```

#### `item-dialog/ModifierGroupsEditor.tsx`

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toArabicNumber } from '@/lib/format';
import type { GroupDraft, OptionDraft } from './types';
import { ModifierGroupCard } from './ModifierGroupCard';

export function ModifierGroupsEditor({ fId, groups, onAddGroup, onRemoveGroup, onUpdateGroup, onAddOption, onUpdateOption, onRemoveOption }: {
        fId: string;
        groups: GroupDraft[];
        onAddGroup: () => void;
        onRemoveGroup: (key: string) => void;
        onUpdateGroup: (key: string, patch: Partial<GroupDraft>) => void;
        onAddOption: (groupKey: string) => void;
        onUpdateOption: (groupKey: string, optionKey: string, patch: Partial<OptionDraft>) => void;
        onRemoveOption: (groupKey: string, optionKey: string) => void;
}) /* JSX: 616–643 (الرأس/الفراغ) + 644–654 (الحلقة)؛ داخل الحلقة: <ModifierGroupCard fId group={g} index={gi} ... /> */
```

#### `item-dialog/ModifierGroupCard.tsx`

```tsx
'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { toArabicNumber } from '@/lib/format';
import type { GroupDraft, OptionDraft } from './types';
import { ModifierOptionRow } from './ModifierOptionRow';

export function ModifierGroupCard({ fId, group, index, onUpdateGroup, onRemoveGroup, onAddOption, onUpdateOption, onRemoveOption }: {
        fId: string;
        group: GroupDraft;
        index: number;                                  // = gi — يُستخدم في toArabicNumber(index+1) والـaria
        onUpdateGroup: (key: string, patch: Partial<GroupDraft>) => void;
        onRemoveGroup: (key: string) => void;
        onAddOption: (groupKey: string) => void;
        onUpdateOption: (groupKey: string, optionKey: string, patch: Partial<OptionDraft>) => void;
        onRemoveOption: (groupKey: string, optionKey: string) => void;
}) /* JSX: 646–734 (رأس المجموعة/الأسماء/الحدود/الإلزامية) + 735–742 (ترويسة الخيارات) +
     796–805 (زر إضافة خيار)؛ الصفوف: <ModifierOptionRow fId groupKey={g.key} option={o} index={oi} ... /> */
```

#### `item-dialog/ModifierOptionRow.tsx`

```tsx
'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
import { toArabicNumber } from '@/lib/format';
import type { OptionDraft } from './types';

export function ModifierOptionRow({ fId, groupKey, option, index, onUpdateOption, onRemoveOption }: {
        fId: string;
        groupKey: string;
        option: OptionDraft;
        index: number;                                  // = oi
        onUpdateOption: (groupKey: string, optionKey: string, patch: Partial<OptionDraft>) => void;
        onRemoveOption: (groupKey: string, optionKey: string) => void;
}) /* JSX: 743–795 حرفياً — كل div الطبقة الخارجية class="flex flex-wrap items-end gap-2
     rounded-md border border-border/30 bg-background/60 p-2" محفوظة (محدد team11 البنيوي) */
```

#### `item-dialog/FeaturedShowcaseSection.tsx`

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle } from 'lucide-react';
import SparklesIcon from '@/components/ui/sparkles-icon';

export function FeaturedShowcaseSection({ fId, isFeatured, onToggleFeatured, featuredRank, onRankChange, showcaseTags, badgeDraft, onBadgeDraftChange, onAddBadge, onRemoveBadge }: {
        fId: string;
        isFeatured: boolean;
        onToggleFeatured: (v: boolean) => void;      // patch({ isFeatured: v })
        featuredRank: string;
        onRankChange: (v: string) => void;           // patch({ featuredRank: v })
        showcaseTags: string[];
        badgeDraft: string;
        onBadgeDraftChange: (v: string) => void;
        onAddBadge: () => void;
        onRemoveBadge: (tag: string) => void;
}) /* JSX: 812–905 حرفياً — Switch يحتفظ بـid="item-featured-switch" الحرفي (محدد team8) */
```

#### `item-dialog/DietaryAllergensSection.tsx`

```tsx
'use client';
import { AlertTriangle } from 'lucide-react';
import { DIETARY_OPTIONS, ALLERGEN_OPTIONS, DIETARY_ICONS, DIETARY_LABELS, ALLERGEN_LABELS } from '@/lib/dietary';
import { cn } from '@/lib/utils';

export function DietaryAllergensSection({ fId, dietaryTags, allergens, onToggleDietary, onToggleAllergen }: {
        fId: string;
        dietaryTags: string[];
        allergens: string[];
        onToggleDietary: (t: string) => void;        // useItemForm().toggleDietaryTag
        onToggleAllergen: (t: string) => void;       // useItemForm().toggleAllergen
}) /* JSX: 907–969 حرفياً — الأزرار تستدعي onToggleDietary(t)/onToggleAllergen(t) بدل setForm المضمّن */
```

#### `ItemDialog.tsx` (المنظِّم — نفس المسار)

```tsx
'use client';
import { useEffect, useId } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useItemForm } from './item-dialog/use-item-form';
import { useModifierGroups } from './item-dialog/use-modifier-groups';
import { useImageUpload } from './item-dialog/use-image-upload';
import { useItemSave } from './item-dialog/use-item-save';
import { ItemCoreFields } from './item-dialog/ItemCoreFields';
import { ItemImageField } from './item-dialog/ItemImageField';
import { ModifierGroupsEditor } from './item-dialog/ModifierGroupsEditor';
import { FeaturedShowcaseSection } from './item-dialog/FeaturedShowcaseSection';
import { DietaryAllergensSection } from './item-dialog/DietaryAllergensSection';
import type { Item } from './item-dialog/types';

/* إعادة التصدير تحافظ على مساري الاستيراد الخارجيين دون لمس:
   - owner/menu/types.ts يستورد ItemModifierGroup من هنا
   - knip (r94): ItemModifierOption/ModifierGroupPayload غير مستوردَين اليوم — تبقى للعقد */
export type { Item, ItemModifierOption, ItemModifierGroup, ModifierGroupPayload } from './item-dialog/types';

export function ItemDialog({ open, onOpenChange, editing, categoryId, onSaved }: {
        open: boolean;
        onOpenChange: (o: boolean) => void;
        editing: Item | null;
        categoryId: number;
        onSaved: () => void;
}) {
        const fId = useId();                                  // 176 — واحد فقط، يُمرَّر للكل
        const { form, patch, badgeDraft, setBadgeDraft, addBadge, removeBadge, toggleDietaryTag, toggleAllergen, reset: resetForm } = useItemForm();
        const { groups, addGroup, updateGroup, removeGroup, addOption, updateOption, removeOption, reset: resetGroups, buildPayload } = useModifierGroups();
        const { uploading, uploadFile } = useImageUpload((url) => patch({ image: url }));
        const { saving, save } = useItemSave({ editing, form, groups, buildPayload, onOpenChange, onSaved });

        // تأثير الإعادة 332–358 — نفس deps [open, editing, categoryId] ونفس الشرط if (open)
        useEffect(() => {
                if (open) {
                        setBadgeDraft('');                    // يبقى أول استدعاء (تطابق الترتيب)
                        resetGroups(editing?.modifierGroups);
                        resetForm(editing, categoryId);
                }
        }, [open, editing, categoryId, resetGroups, resetForm, setBadgeDraft]);
        // ملاحظة: reset/resetGroups/setBadgeDraft مراجع ثابتة (state setters وتوابع تُعاد
        // إنشاؤها كل رندر كما اليوم) — إدراجها في deps آمن ولا يغيّر توقيت التنفيذ
        // (تأثير واحد فقط في الملف كله، كما كان).

        return (
                <Dialog open={open} onOpenChange={onOpenChange}>
                        <DialogContent className="max-w-lg rounded-md">
                                <DialogHeader>
                                        <DialogTitle>{editing ? 'تعديل صنف' : 'إضافة صنف'}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                        <ItemCoreFields fId={fId} form={form} patch={patch} />
                                        <ItemImageField fId={fId} image={form.image} uploading={uploading}
                                                onImageChange={(v) => patch({ image: v })} onUploadFile={uploadFile} />
                                        <ModifierGroupsEditor fId={fId} groups={groups} onAddGroup={addGroup}
                                                onRemoveGroup={removeGroup} onUpdateGroup={updateGroup}
                                                onAddOption={addOption} onUpdateOption={updateOption} onRemoveOption={removeOption} />
                                        <FeaturedShowcaseSection fId={fId} isFeatured={form.isFeatured}
                                                onToggleFeatured={(v) => patch({ isFeatured: v })}
                                                featuredRank={form.featuredRank} onRankChange={(v) => patch({ featuredRank: v })}
                                                showcaseTags={form.showcaseTags} badgeDraft={badgeDraft}
                                                onBadgeDraftChange={setBadgeDraft} onAddBadge={addBadge} onRemoveBadge={removeBadge} />
                                        <DietaryAllergensSection fId={fId} dietaryTags={form.dietaryTags}
                                                allergens={form.allergens} onToggleDietary={toggleDietaryTag} onToggleAllergen={toggleAllergen} />
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                        <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
                                        <Button variant="orange" onClick={save} disabled={saving || uploading}>
                                                {editing ? 'تحديث' : 'إضافة'}
                                        </Button>
                                </div>
                        </DialogContent>
                </Dialog>
        );
}
```

### 2.6 الحالة المشتركة: ما يبقى في الأب وما يُرفع

| الحالة | القرار | التعليل |
|---|---|---|
| `open` / `onOpenChange` / `editing` / `categoryId` / `onSaved` | **تبقى props في الأب** | العقد العام لا يتغير — `owner/menu/page.tsx` بلا أي تعديل |
| `form` (+ `badgeDraft`) | **تُرفع إلى `useItemForm`** لكن المنظِّم يظل المستهلك الوحيد للحزمة `form` (يوزّع شرائحها كـprops للقسم) | الحقول كلها تتحرك عبر `patch` جزئي — لا حالة مكرّرة |
| `groups` + 6 معالجات | **تُرفع إلى `useModifierGroups`** بالكامل | المعدِّلات نطاق مغلق (أضف/عدّل/احذف/تحقق) لا يخرج منه إلا `buildPayload()` و`reset()` |
| `uploading` + الرفع | **تُرفع إلى `useImageUpload`** | التواصل مع الأب عبر ردّ `onUploaded` فقط؛ `uploading` يُقرأ لعرض الـspinner وتعطيل الحفظ |
| `saving` + `save` | **تُرفع إلى `useItemSave`** | يستهلك `form/groups/buildPayload` من نفس الرندر (لا `useCallback` — مطابق لليوم) |
| `fId = useId()` | **يبقى في الأب** ويُمرَّر prop للجميع | استدعاء واحد فقط ⇒ لا تصادم معرفات بين نسخ الحوار (سلوك اليوم بعينه) |
| `draftSeq` (عداد المفاتيح) | **يبقى على مستوى الوحدة** في `modifier-draft-utils.ts` | نقلُه داخل الـhook يجعله لكل نسخة — يبقى فريداً لكن نُبقيه كما هو حرفياً |

**تدفق البيانات**: خط واحد من الأعلى للأسفل (props → sections) وخط صعود واحد للأحداث (callbacks). لا سياقات، ولا مكتبة حالة — التفكيك "بدالة سياق صفر".

### 2.7 سجل المخاطر

#### خطر 1 — **تجميد محددات e2e (الأخطر عملياً)**
الاختبارات التالية ستكسر بصمت عند أي انحراف نصي/بنيوي — هذه لائحة التجميد الحرفية:

| المحدد | الاختبار المستخدم | الموقع في المصدر |
|---|---|---|
| `#item-featured-switch` | team8-featured (`dialog.locator("#item-featured-switch")`) | 825 (حرفي — **لا يجوز تحويله إلى fId**) |
| نص «عرض في قسم الأصناف المميزة» | team8 (click على النص) | 818 |
| heading «تعديل صنف» / «إضافة صنف» | team11 (62)، team8 (111)، r93-sim-owner (142) | 450 |
| زر «تحديث» / نص toast «تم تحديث الصنف» | team11 (127, 128) | 976 / 436 |
| زر «إضافة مجموعة» | team11 (86) | 636 |
| `aria-label="حذف مجموعة الحجم"` | team11 (82) — قالب: `حذف مجموعة ${g.nameAr \|\| gi+1}` | 659 |
| placeholder «الحجم» | team11 (88: `getByPlaceholder(GROUP)`) | 671 |
| Labels «الحد الأدنى»/«الحد الأقصى» عبر `getByLabel` | team11 (89–90) — يتطلب بقاء ربط `htmlFor`↔`id` سليماً | 691–712 |
| `fieldset[aria-label="مجموعة الخيارات رقم ١"]` | team11 (113) | 649 |
| زر «إضافة خيار» + `aria-label="إضافة خيار إلى المجموعة رقم ١"` | team11 (103) | 804 / 802 |
| `div.flex-wrap.items-end` (`.last()`) لصف الخيار | team11 (105) — **محدد بنيوي على الطبقات** | 746 |
| `[role="dialog"]` + أزرار «إلغاء» | persona-3-owner، r93-sim-owner | shadcn Dialog (لا يُلمس) |
| ملاحظة: persona-3 يستهدف زر «حفظ» وplaceholder «الاسم/السعر» ب حراسة `if (count())` متسامحة — محدداته **متقادمة** (الزر الفعلي «إضافة»/«تحديث»، placeholder الاسم «كابتشينو») فلا تُعتمد كحاجز، ولا تصلح ذريعةً لتغيير النصوص أيضاً | | 971–977 |

#### خطر 2 — ترتيب وتوقيت `useEffect` الإعادة
اليوم تأثير **واحد** (332–358) بـdeps `[open, editing, categoryId]`. الصياغة الجديدة تُبقي تأثيراً واحداً في المنظِّم يستدعي `setBadgeDraft('')` → `resetGroups(...)` → `resetForm(...)` — نفس الترتيب، وReact يجمّع الثلاثة في نفس الحزمة (الشرائح مستقلة فالنتيجة النهائية متطابقة رياضياً). **القاعدة: لا يُضاف أي `useEffect` جديد في أي ملف من الملفات الـ14** — كل المنطق التفاعلي ردود أحداث. هذا يُبطل فئة مخاطر "تأثيرات ترتيبية متزامنة" من الأساس.
تحليل الأمان على deps: الأب (`owner/menu/page.tsx`) يغيّر `itemCatId`/`itemEditing` **فقط والحوار مغلق** (`handleAddItem` 183–187 و`handleEditItem` 195–198 يضبطان الحالة قبل فتح الحوار بنفس الحزمة) — فالتأثير يُطلق فعلياً عند انتقال `open:false→true` فقط، كما اليوم.

#### خطر 3 — إعادة الضبط (defaultValues)
الحوار يُعاد ضبطه **عند الفتح** لا بالتركيب (لا `key` remount). الخطة تُبقي النمط كما هو حرفياً؛ **يُمنع صراحة** التحويل إلى `key={open ? ... }` في هذه الموجة (تغيير سلوك غير محمي باختبار). الدالة `initForm` وحقول `editing` الـ14 تنقل دون تحريف.

#### خطر 4 — سباقات الإغلاق القديم (stale closures)
- (أ) الرفع (569): `setForm({...form, image})` بإغلاق رندرِ بدء الرفع — **يُصلَح** بجعل `patch` تحديثاً وظيفياً (`setForm(prev => ...)`). هذا **التغيير السلوكي الوحيد المتعمد** في الخطة (إصلاح فقدان تعديلات المستخدم أثناء الرفع)، لا يمس أي مسار متزامن (كل ردود الكتابة الأخرى متزامنة). يوثَّق في رسالة الـcommit.
- (ب) `save`: اليوم تُنشأ من جديد كل رندر وتلتقط `form/groups` الحالية، والزر يعرضها من نفس الرندر — الصياغة الجديدة (hook بلا `useCallback`) تحافظ على الهوية الدلالية نفسها. **يُمنع إدخال `useCallback`/`useMemo`** في هذه الموجة (هدفها النقل الآمن لا الأداء).

#### خطر 5 — دلالات الحفظ الدقيقة
- الحراسة `if (saving) return` أول سطر في `save` + `disabled={saving || uploading}` في الزر — تُنقل كما هي (منع الازدواج).
- ترتيب التحقق: name/price → image URL → featuredRank → payload المعدِّلات — **الترتيب جزء من السلوك** (رسائل الخطأ تظهر بالأولوية نفسها).
- `if (groups.length > 0 && !modifierGroupsPayload) return;` (380) — العبارة تُنقل حرفياً: فراغ المسوّدات = `[]` ويُرسل (يمحو المخزّن — عقد PUT في `api/items/[id]/route.ts:27`)، بينما المسوّدات غير الفارغة الفاسدة تُوقف الحفظ.
- دلالات round88-C (396–409): `featuredRank`/`showcaseTags` لا تُرسل إلا عند `isFeatured` — التعليق ينقل مع الكود (حماية من "إعادة التمييز تفقد الترتيب/الشارات").

#### خطر 6 — معامل `draftSeq` على مستوى الوحدة
يبقى خارج أي مكوّن (كما اليوم). عدّاد لكل نسخة سيظل فريداً لكنه انحراف عن الحرفية بلا داعٍ.

#### خطر 7 — أثر `knip`
`ItemModifierOption` و`ModifierGroupPayload` مُعلَّمتان اليوم كنوعين غير مستورَدين (r94 knip). إعادة التصدير من `ItemDialog.tsx` **تحافظ** على الحالة (advisory) وتحمي مستقبلاً أي مستهلك — لا حذف.

#### خطر 8 — أثر a11y (round86-C9)
كل روابط `htmlFor`↔`id` المعتمدة على `fId` تُنقل ببنية `${fId}-<field>` نفسها؛ `fId` واحد من الأب يمنع التصادم. زر الحالة/section spans ذات الـids المعطوبة (594/854/909/941) تُصلح في خطوة 18 بعد التحقق `rg '"`' tests/ src/` = صفر مراجع.

### 2.8 الاختبارات الحامية للسلوك (جرد دقيق)

#### اختبارات unit (تحمي ساق الـAPI لا الحوار نفسه)
| الملف | الحالات | ما يحميه من سلوك ItemDialog |
|---|---|---|
| `tests/unit/items-featured.test.ts` | 7 | سلسلة `isFeatured` على PUT: إرسال flag+rank+tags، OFF المجرّد يحفظ الشارات (round88-C)، الحقول المحذوفة لا تطمس، حدَّا rank 0/6 → 422، قstrip `showcaseTag` القديم — أي انحراف في بناء جسم الطلب (383–415) يكسرها |
| `tests/unit/items-contract.test.ts` | 8 | سقف الصورة 200k حرفاً، enum الحالة، قفل maxItems FOR UPDATE — يحمي `image`/`status` في الجسم |
| `tests/unit/orders-items-throttle.test.ts` | 5 | خنق PUT 20/دقيقة للجلسة |
| `tests/unit/r93-items-get-ratelimit.test.ts` | 6 | خنق GET 60/د/IP |
| `tests/unit/menu-modifiers.test.ts` | 31 | منطق المنيو العام (toggle/validate/delta) — **ليس الحوار** لكنه يجمّد شكل `modifierGroups` الذي يقرؤه الحوار |
| **فجوة**: لا يوجد أي ملف unit يستورد/يعرض `ItemDialog` — تحقق الحوار (messages العربية، buildModifierGroupsPayload، addBadge) **بلا تغطية unit** | | |

#### اختبارات e2e (الحماية الفعلية للحوار)
| الملف | التغطية للحوار | القوة |
|---|---|---|
| `tests/e2e/teams/team11-modifiers.spec.ts` (مشروع qa-teams) | رحلة كاملة: فتح «تعديل صنف» → حذف مجموعة قديمة (idempotency) → «إضافة مجموعة» → fill «الحجم»/min/max → «إضافة خيار» ×2 + أسعار → «تحديث» → toast → المنيو العام → طلب مسعّر | **الأقوى — يغطي محرر المعدِّلات كاملاً** |
| `tests/e2e/team8-featured.spec.ts` (serial) | فتح المحرر، `#item-featured-switch`، off→on، «تحديث»، اختفاء/عودة المشهد، شارة العرض | قوي — يغطي قسم التمييز |
| `tests/e2e/round79-phaseC-journey.spec.ts` | إدارة منيو المالك + تمييز صنفين عبر تحكم Stage-H | متوسط |
| `tests/e2e/persona-3-owner.spec.ts` | «إضافة صنف» → حوار → (ملء متسامح بحراس count) | ضعيف — محدداته متقادمة |
| `tests/e2e/r93-sim-owner.spec.ts` | فتح «إضافة صنف» + لقطة شاشة | ضعيف (فحص مظهر) |
| ملاحظة: `scripts/round86-axe-sweep.mjs` يغطي الصفحات العامة فقط (`/`, `/pricing`, `/menu/al-waha-cafe`) — **لا يشمل /owner/menu**؛ روابط label↔control للحوار غير محمية بأي فحص axe آلي حالي | | |

**الخلاصة**: مسار المعدِّلات+الحفظ محمي بـteam11، ومسار التمييز بـteam8؛ مسارات **رفع الصورة، شارات العرض، dietary/allergens، سعر الخصم = غير مغطاة نهائياً** بأي اختبار — لذا تُنقل حرفياً وتُختبر يدوياً مرة (خطوة 17).

### 2.9 خطة النقل الآمن (خطوات مرقمة — قابلة للتنفيذ حرفياً)

> القاعدة الناظمة: **نقل حرفي بلا إعادة صياغة**؛ الاستثناءات المصرّح بها وحدها: (1) تحويل `buildModifierGroupsPayload` لمعامل، (2) `patch` وظيفي، (3) `onUploaded(url)`. كل خطوة تنتهي بالتحقق المكتوب.

1. **قاعدة البداية (لا كود)**: `git switch -c r94-item-dialog-split` من `aec233ba`؛ تشغيل الحاجزين الأساسيين محلياً:
   `env -u DATABASE_URL pnpm vitest run tests/unit/items-featured.test.ts tests/unit/items-contract.test.ts tests/unit/menu-modifiers.test.ts tests/unit/orders-items-throttle.test.ts` → يجب 51/51 خضراء (7+8+31+5).
2. **إنشاء `src/components/owner/item-dialog/types.ts`**: انقل حرفياً الأسطر 26–110 (مع تصدير `Item` و`OptionDraft`/`GroupDraft`), 90–91, 159؛ أضف `ItemFormState` (2.5). تحقق: `pnpm exec tsc --noEmit` — (الملف القديم لم يُلمس بعد؛ سيكون هناك ازدواج مؤقت مقبول خلال الخطوات 2–14 لأن لا استيرادات جديدة أُضيفت بعد).
3. **إنشاء `modifier-draft-utils.ts`**: انقل 112–116 و118–138 حرفياً؛ انقل 275–330 مع الاستبدال الوحيد: السطر 278 `for (const [gi, g] of groups.entries())` يبقى، والإغلاق على `groups` يصبح المعامل — عدّل التوقيع إلى `export function buildModifierGroupsPayload(groups: GroupDraft[])`. تحقق: tsc.
4. **إنشاء `use-modifier-groups.ts`** بعقد 2.5: انقل الحالة (182) والمعالجات الست (196–273) حرفياً داخل الـhook؛ `reset = (source) => setGroups(groupsFromItem(source))`؛ `buildPayload = () => buildModifierGroupsPayload(groups)`.
5. **إنشاء `use-item-form.ts`**: انقل `initForm` (142–157)، الحالة (177, 180)، `addBadge` (184–193)؛ نفّذ `patch = (p) => setForm((prev) => ({ ...prev, ...p }))` (تحديث وظيفي — خطر 4-أ)؛ استخرج `removeBadge/toggleDietaryTag/toggleAllergen` بنقل أجساد الـsetForm من JSX (884–898, 911–935, 943–967) مع تحويلها لنمط وظيفي؛ `reset(editing, categoryId)` = جسد 337–356 (بدون `setBadgeDraft('')` — يبقى في تأثير الأب أولاً كما في المنظِّم النموذجي 2.5).
6. **إنشاء `use-image-upload.ts`**: انقل الحالة (179) وجسد الرفع (553–576)؛ `onUploaded(d.data.url)` بدل `setForm({...form, image: ...})`؛ عدّل بداية المعالج: كان داخل `onChange` يتحقق `e.target.files?.[0]` — أبقِ التحقق في المكون (نقطة 7) والمعامل `file: File`.
7. **إنشاء `use-item-save.ts`** بعقد `UseItemSaveArgs`: انقل 360–444 حرفياً مع الاستبدالات الميكانيكية: `form.` → `args.form.` (أو تفكيك محلي)، `groups` → `args.groups`، `buildModifierGroupsPayload()` → `args.buildPayload()`، `editing` → `args.editing`، `onOpenChange/onSaved` → `args.`. أبقِ الحراسة والترتيب والتعليقات (396–414) كما هي.
8. **إنشاء `ModifierOptionRow.tsx`**: انقل JSX 743–795 حرفياً؛ الاستبدالات: `updateOption(g.key, o.key, {...})` → `onUpdateOption(groupKey, option.key, {...})`، و`removeOption(g.key, o.key)` → `onRemoveOption(groupKey, option.key)`، و`gi/oi` → `index` (الممرَّر).
9. **إنشاء `ModifierGroupCard.tsx`**: انقل 646–734 + 735–742 + 796–805؛ داخل حلقة الخيارات (743) ضع `<ModifierOptionRow fId={fId} groupKey={g.key} option={o} index={oi} onUpdateOption={onUpdateOption} onRemoveOption={onRemoveOption} />`.
10. **إنشاء `ModifierGroupsEditor.tsx`**: انقل 619–643 + 644–654؛ الحلقة تصبح `<ModifierGroupCard fId={fId} group={g} index={gi} onUpdateGroup={onUpdateGroup} onRemoveGroup={onRemoveGroup} onAddOption={onAddOption} onUpdateOption={onUpdateOption} onRemoveOption={onRemoveOption} />`.
11. **إنشاء `FeaturedShowcaseSection.tsx`**: انقل 812–905 حرفياً؛ `setForm({...form, isFeatured: v})` → `onToggleFeatured(v)`؛ rank → `onRankChange`؛ chips الحذف (888–892) → `onRemoveBadge(tag)`؛ حافظ على `id="item-featured-switch"` حرفياً وEnter→`onAddBadge()`.
12. **إنشاء `DietaryAllergensSection.tsx`**: انقل 907–969؛ onClick → `onToggleDietary(t)` / `onToggleAllergen(t)`.
13. **إنشاء `ItemCoreFields.tsx`** (453–531 + 593–614) و**`ItemImageField.tsx`** (532–592): كل onChange متزامن يصبح `patch({ <حقل>: e.target.value })` (أو `Number(e.target.value)` للسعر كما هو)؛ حقل الملف: `onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadFile(f); }}`.
14. **إعادة كتابة `ItemDialog.tsx`** بالمنظِّم النموذجي (2.5-أخيراً): نفس props العامة + إعادة تصدير الأنواع + `fId`/التأثير/التوصيل/التذييل. **احذف** كل المنقول (يظل الملف ~150 سطراً). تحقق: `pnpm exec tsc --noEmit` نظيف.
15. **بوابة الأنواع والوحدات**: `pnpm exec tsc --noEmit` ثم `env -u DATABASE_URL pnpm vitest run` (المنوال الـ124 كاملة أو على الأقل ملفات items الستة أعلاه) — يجب أن تبقى أرقام الحالات كما كانت بالضبط (لا إضافة/حذف).
16. **بوابة e2e المحلية إن توفرت البيئة** (QA seeded): `npx playwright test tests/e2e/teams/team11-modifiers.spec.ts tests/e2e/team8-featured.spec.ts --project=qa-teams` — وإلا فالاعتماد على CI (يعملها ضمن المشاريع الأربعة). علامة النجاح: team11 تمرّ بمراحلها الخمس وteam8 بامتحانيها المتسلسلين.
17. **فحص يدوي للمسارات غير المغطاة** (رفع الصورة، شارات، dietary/allergens، سعر الخصم): فتح الحوار محلياً بـ`pnpm dev` وتجربة الرفع عبر الزر (يتطلب `BLOB_READ_WRITE_TOKEN`) + إضافة/حذف شارة + تبديل شارات الطعام — 5 دقائق، لأن لا اختبار يغطيها.
18. **تنظيف فرصي (ميكانيكي بحت)**: أصلح الـids الأربعة المعطوبة إلى قوالب حقيقية (`` id={`${fId}-status`} `` في 594/854/909/941 — تحقق أولاً: `rg '`\$\{fId\}' tests/ src/` صفر مراجع خارج الملف) ثم `pnpm exec prettier --write "src/components/owner/item-dialog" src/components/owner/ItemDialog.tsx`. أعد `tsc` + الفحوص بعد التنسيق.
19. **تدقيق المحددات بعد الدمج** (أوامر حرفية):
    `rg -n '#item-featured-switch' src/components/owner/` (يجب يظهر مرة واحدة في FeaturedShowcaseSection)
    `rg -n 'item-featured-switch' tests/` (team8 — يبقى يمرّ)
    `rg -c 'aria-label="إضافة مجموعة|aria-label="حذف مجموعة|الحد الأدنى|الحد الأقصى|flex flex-wrap items-end' src/components/owner/item-dialog/` (يجب ≈ القيم نفسها كما قبل النقل).
20. **إن كان knip ضمن البوابة**: إعادة `npx knip` — التوقع: `ItemModifierOption/ModifierGroupPayload` تبقى advisory (كما r94) — لا يُسمح بظهور ملفات item-dialog الجديدة في قائمة "unused files" (كلها مستوردة من المنظِّم).

> **حجم الـPR المتوقع**: ~980 سطراً محذوفة من ItemDialog.tsx مقابل ~1,300 سطراً موزعة على 14 ملفاً (منها تعليقات العقود). لا مسار API يُلمس، ولا schema، ولا حزمة.

### 2.10 اختبارات جديدة مقترحة (سد الفجوات — موجة تالية أو نفس الـPR)

- **`tests/unit/item-modifier-drafts.test.ts`** (جديد، أعلى قيمة/جهد): بعد الخطوة 3 تصبح `buildModifierGroupsPayload` و`groupsFromItem` و`nextDraftKey` نقية وقابلة للاختبار المباشر (بلا DOM). مصفوفة مقترحة (~25 حالة): فراغ → `[]`؛ مجموعة بلا اسم → `null`؛ min سالب/عشري/>10؛ max=0؛ min>max؛ خيار بلا اسم؛ priceDelta غير رقمي؛ name إنجليزي اختياري يُهمل عند الفراغ؛ sortOrder fallback للفهرس؛ ثبات مفاتيح `nextDraftKey` (تفرّد عبر استدعاءات متتابعة)؛ ذهاب/إياب `groupsFromItem`⇄payload للحقول الرقمية.
- **اختبار تفاعلي خفيف للحوار** (اختياري، react-testing-library غير مثبت في المشروع — يستلزم قراراً معمارياً؛ يُترك توصيةً لا خطوة): فتح/إغلاق يعيد الضبط، addBadge يمنع الرابع والمكرر.
- ترقية محددات persona-3-owner المتقادمة (زر «حفظ» غير موجود) — إصلاح اختبار مستقل بلا صلة بالتفكيك، لكنه يرفع جودة الحاجز مستقبلاً.

---

## 3. القسم الثاني — جرد جودة الكود

### 3.1 أكبر 10 ملفات في src/ (باستثناء `src/generated/**` — مولّد Prisma)

| # | الملف | أسطر | لماذا كبير؟ | هل يستحق تفكيكاً؟ |
|---|---|---|---|---|
| 1 | `src/app/globals.css` | 1210 | توكنز التصميم + `@utility` + keyframes + glass/animations — **بنية CSS مركزية مقصودة** | لا — ليس مكوّناً؛ أي "تفكيك" يشتت التوكنز (استثناء مشروع من أي حد أسطر) |
| 2 | `src/components/owner/ItemDialog.tsx` | 982 | نموذج 5 مجالات + محرر معدِّلات + رفع + حفظ في ملف واحد | **نعم — خطة القسم الأول** |
| 3 | `src/app/(protected)/subscribe/SubscribeForm.tsx` | 604 | نموذج تسجيل متعدد الخطوات + تحقق مسبق username/slug + حالة لمس الحقول | **نعم (أولوية 2)**: استخراج خطوة الباقة/بيانات المطعم/الحساب إلى مكونات + `useSubscribeValidation` للتحقق المسبق |
| 4 | `src/components/shared/PaymentDialog.tsx` | 598 | آلة حالات 5 خطوات (`form/waiting/success/approved/rejected`) + رفع إيصال + مزوّدان محليان | **نعم (أولوية 3)**: كل خطوة مكوّن + `usePaymentFlow` (state machine نقية قابلة للاختبار) |
| 5 | `src/components/menu/OrderDialog.tsx` | 585 | كمية + اختيار معدِّلات + نوع الطلب + بيانات عميل + إرسال واتساب | **نعم (أولوية 4)**: نفس نمط item-dialog؛ المنطق النقي (validate/delta) **مستخرج أصلاً** في `menu-modifiers` المُختبَر — التفكيك واجهة فقط، خطر منخفض |
| 6 | `src/app/(protected)/owner/settings/page.tsx` | 545 | نموذج إعدادات + رفع شعار/غاليري (حالتا رفع) + pickupTypes | متوسط: استخراج `LogoUpload`/`GalleryUpload` (نمط use-image-upload قابل لإعادة الاستخدام من الخطة!) ثم يهبط ~350 |
| 7 | `src/app/(protected)/owner/page.tsx` | 512 | لوحة المالك: fetch متوازي ×4 + تبويبان | منخفض — KpiGrid/Charts/OrdersList مستخرجة سابقاً (r89-G3)؛ الباقي هو التجليف والبيانات؛ يكفي `useOwnerDashboardData` (~80 سطراً) عند الحاجة |
| 8 | `src/app/(protected)/owner/loyalty/page.tsx` | 498 | إحصاءات + بطاقة + إحالة + مكونات AnimatedCount/StatCard داخلية | منخفض (تحت 500): المكونات الفرعية الداخلية جاهزة للنقل عند أول تعديل قادم |
| 9 | `src/app/(protected)/admin/page.tsx` | 495 | لوحة أدمن بـPromise.all | منخفض |
| 10 | `src/app/(protected)/admin/admins/page.tsx` | 446 | جدول + حوار صلاحيات | منخفض |

**الخلاصة**: بعد ItemDialog، المرشحان الأقوى هما **SubscribeForm** و**PaymentDialog** (كلاهما حوارات/نماذج متعددة الخطوات بنفس الأمراض)، ثم **OrderDialog**. عائد `use-image-upload`/`useModifierGroups` من خطة C قابل لإعادة الاستخدام في 3 من هذه الملفات — الترتيب يخفض كلفة الموجات التالية.

### 3.2 TODO/FIXME/HACK/XXX في src/

`rg "TODO|FIXME|HACK|XXX"` عبر src/ = **صفر مطابقات حقيقية**. النتيجتان الوحيدتان إيجابيتان كاذبتان (نمط هاتف في placeholder):
- `src/components/shared/PaymentDialog.tsx:298` — `placeholder="09XXXXXXXXX"`
- `src/app/(protected)/cart/CustomerInfoCard.tsx:44` — `placeholder="09XXXXXXXX"`

**تقييم**: انضباط ممتاز — الديون التقنية في هذا المشروع تُوثَّق في worklog/الجولات (تعليقات مرقّمة roundXX) لا كعلامات TODO معلقة.

### 3.3 الكود الميت (knip)

الحالة: `knip@5.46.4` مُثبَّت pinned بdevDependencies مع `knip.config.ts` (منهجية r90-F6 الموثقة: advisory لا بوابة CI؛ knip v6 محظور — انهيار oxc-parser في هذه البيئة). شُغِّل فعلياً (`npx knip --reporter json`) — النتائج:

1. **ملفات غير مستخدمة: 21 — كلها في `scripts/`** (برامج جولات لمرة واحدة: bundle-report، image-health، qa-cleanup-check، r91-check-premium، r92-compress-og، r92-prod-audit، render-og، round86-axe-sweep، round86-evidence، round{86-91}-prod-verify، round{87,88}-evidence، round88-perf/* ×5). **التقييم**: متوقعة وموثقة في الكونفق («إشارة حقيقية مقصودة — advisory»)؛ لا حذف تلقائي — قرار أرشفة جماعي لسكربتات ما قبل r90 (يوفّر ~صفر من حزمة الإنتاج، فائدته تنظيمية فقط).
2. **صدادات غير مستوردة: 54 صادرات + 45 نوعاً عبر 48 ملفاً في src/**. التوزيع:
   - **kit shadcn/ui base-nova كامل عن قصد** (sheet/dialog/card/select/table/badge/motion-icons...: ~46 صادرات) — اكتمال الطقم؛ لا يُحذف (تحديثات shadcn تعتمد التوقيع الكامل).
   - **مرشّحات تقليم فعلية (12 صادراً حقيقياً)**: `CSRF_EXEMPT` (lib/csrf.ts:8) · `sendToChat` (lib/telegram-broadcast.ts:15) · `ANALYTICS_RANGES/startOfDay/addDays/eachDateKey` (lib/chart-stats.ts) · `polarToCartesian` (lib/chart-geometry.ts:56) · `useDebouncedCallback` (MenuToolbar.tsx:23) · `PICKUP_TYPE_META` (lib/order-status.ts:87) · `normalizeDigits` (lib/payment-schema.ts:18) · `OwnerKpiGridSkeleton` (OwnerKpiGrid.tsx:12) · `stepIndex` (StepIndicator.tsx:19) · `log/debug` (lib/logger.ts:23,40) · `fadeUpSpring` (lib/motion.ts:18).
   - **أنواع غير مستوردة (45)**: أغلبها أنواع عقد عامة (ScopeAuth, PopularItemsRow, NavItem...) — advisory سليم؛ من ضمنها `ItemModifierOption` و`ModifierGroupPayload` من **ItemDialog.tsx:49,94** — الخطة (2.5) تحافظ عليهما بإعادة التصدير لأن عقد الـAPI يوثَّق بهما.
   - ملاحظة إضافية: `prisma.config.ts` → تبعية `dotenv` unlisted (غير في package.json — يعمل عبر hoisting؛ خطر منخفض لكن يُوثَّق).
3. **لا تشغيل بناء** في هذه الجولة (التزمت بالقواعد) — knip وحده كافٍ كإشارة.

### 3.4 التبعيات الدائرية

فحص رسمي: بناءُ رسم استيراد كامل لـ**418 ملف TS/TSX** في src/ (باستثناء `src/generated/**`) عبر سكربت DFS يحلّل عبارات `import`/`export ... from '@/...'`:
- **الدورات المكتشفة: 0**.
- عيّنات تحقق يدوي للمواضع الأكثر عرضة: `lib/dietary.ts` (يذكر ItemDialog **في تعليق فقط** — لا استيراد)، `lib/csrf-client.ts` (لا يعرف المكوّنات)، `owner/menu/types.ts` → `components/owner/ItemDialog` (اتجاه واحد: صفحة→مكون، والعكس غير موجود).
- **التقييم**: البنية سليمة الاتجاه (app → components → lib؛ lib لا يستورد components إطلاقاً). الخطة المقترحة لا تضيف أي حافة جديدة عبر الحدود (item-dialog/* تستورد lib وui فقط).

---

## 4. التوصيات الختامية

1. **تنفيذ خطة تفكيك ItemDialog كما هي** (القسم 2.9، 20 خطوة) — متطلب مؤجل منذ r92، والخطة الآن تنفيذية حرفياً: حدود قصّ + عقود TS كاملة + مخاطر مُجمَّدة المحددات + خطوات تحقق بعد كل مرحلة. التغير السلوكي الوحيد المتعمد: إصلاح سباق الرفع (569) عبر التحديث الوظيفي.
2. **حماية إضافية قبل التنفيذ** (اختياري لكنه مُوصى به): إضافة `tests/unit/item-modifier-drafts.test.ts` (2.10) قبل نقل الكود — يتحول سلوك التحقق من "غير مُختبَر" إلى "مُختبَر" قبل أول سطر يتحرك.
3. **موجة تفكيك ثانية** (ترتيب مقترح): `SubscribeForm` → `PaymentDialog` → `OrderDialog`، مع إعادة استخدام `use-image-upload` في settings (شعار/غاليري).
4. **تقليم الكود الميت الحقيقي** (12 صادراً في 3.3) في PR ميكانيكي منفصل (لا سلوك، حذف صادرات + tsc) — والاحتفاظ بkit shadcn كما هو.
5. **أرشفة سكربتات الجولات** (21 ملفاً في scripts/) إلى `scripts/archive/` بعد موافقة صاحب العمل (تغيير مسارات مذكورة في ci.yml يستلزم تدقيقاً أولاً — السكربتات المذكورة في knip.config entry لا تُحذف).
6. **إصلاح صغير مؤجل-الصلاحية**: إضافة `dotenv` إلى devDependencies (unlisted في prisma.config.ts).
7. توثيق أن `round86-axe-sweep` لا يغطي `/owner/menu` — عند تنفيذ الخطة يُوصى بتمديد قائمة PAGES للفحص بعد الحوار (خطوة اختيارية).

---
*نهاية تقرير الوكيل C — جولة 94. القراءة تمت فعلياً بالكامل لـItemDialog.tsx (982 سطراً) وowner/menu/page.tsx وtypes.ts وملفات الاختبارات المذكورة؛ knip شُغِّل؛ فحص الدورات نفّذه سكربت DFS على 418 ملفاً. لم يُعدَّل أي كود مصدر.*
