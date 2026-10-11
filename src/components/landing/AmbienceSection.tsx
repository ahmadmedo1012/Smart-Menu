import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { RevealCssClass } from '@/hooks/useReveal';

/* r142 (task 2-b) — AmbienceSection «أجواء المكان»: the editorial rebuild
 * of the r141 ambience band. The chapter now LEADS with the huge quote —
 * the L-shaped editorial grid hangs the two photographs (kitchen +
 * ambience, both now .webp) around it with big mono captions, and the
 * product truth lands under them: the digital menu carries the
 * restaurant's atmosphere AS IT IS — the owner's own photos, words and
 * tone, no staging, no invented claims (r82). Captions stay honest and
 * generic (أجواء المساء / من المطبخ); nothing pretends to be a specific
 * real restaurant.
 *
 * Server component: pure markup; the reveal wrapper is the shared
 * RevealCssClass belt. Images ride next/image, lazy by default (below
 * the fold), with real sizes.
 */
export function AmbienceSection() {
  return (
    <section id="ambience" className="ln-chapter ln-amb" aria-label="أجواء المكان">
      <div className="ln-chapter-head">
        <span className="ln-label">{'04 — الأجواء'}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          منيو يحمل <em>رائحة المكان</em>
        </RevealCssClass>
      </div>

      {/* the huge editorial quote — the chapter's voice */}
      <RevealCssClass as="blockquote" className="ln-amb-quote" delay={1}>
        «القهوة الليبية ليست مشروباً فحسب — مجلسٌ وضيافةٌ وسمرٌ يمتد بعد
        المغرب.»
        <cite className="ln-amb-cite ln-mono">هكذا يُقرأ المطعم قبل أول صنف</cite>
      </RevealCssClass>

      <RevealCssClass as="div" className="ln-amb-grid" delay={2}>
        <div className="ln-amb-media ln-amb-media-lead">
          <Image
            src="/images/culinary/ambience.webp"
            alt="أجواء مسائية دافئة لمقهى — إضاءة كهرمانية وطاولات جاهزة للضيافة"
            fill
            sizes="(max-width: 920px) 92vw, 56vw"
            className="ln-amb-img"
          />
          <span className="ln-amb-tag ln-mono" aria-hidden="true">
            أجواء المساء
          </span>
        </div>

        <div className="ln-amb-media ln-amb-media-side">
          <Image
            src="/images/culinary/kitchen.webp"
            alt="أيدي الطاهي تضع الطبق الأخير قبل تقديمه"
            fill
            sizes="(max-width: 920px) 92vw, 36vw"
            className="ln-amb-img"
          />
          <span className="ln-amb-tag ln-mono" aria-hidden="true">
            من المطبخ
          </span>
        </div>

        <div className="ln-amb-copy">
          <p className="ln-amb-line">
            الصورة تسبق الطعم، والوصف يسبق الطلب. المنيو الرقمي ينقل أجواء
            مطعمك كما هي — صور أصنافك ووصفك ونبرتك تبقى كما كتبتها، بلا
            فلتر وبلا مبالغة.
          </p>
          <p className="ln-amb-sub">
            كل صنف يحمل صورته ووصفه وسعره الواضح، والعميل يقرأ القصة كاملة
            قبل أن يطلب — داخل المكان أو من بعيد.
          </p>
          <Link href="/menu/al-waha-cafe" className="ln-amb-link">
            شاهد كيف تصل الأجواء إلى منيو حقيقي
            <ArrowLeft size={15} aria-hidden="true" />
          </Link>
        </div>
      </RevealCssClass>
    </section>
  );
}
