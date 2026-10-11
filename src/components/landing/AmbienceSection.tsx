import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { RevealCssClass } from '@/hooks/useReveal';

/* r141 (task 2-a) — AmbienceSection «الأجواء»: the editorial ambience
 * band between the roles ledger (05) and the finale (06).
 *
 * An asymmetric grid — a large evening scene leading (inline-start), a
 * smaller kitchen frame staggered beside it, and a short editorial
 * column that lands the product truth: the digital menu carries the
 * restaurant's atmosphere AS IT IS (the owner's own item photos,
 * descriptions and tone) — no staging, no invented claims. The two
 * frames carry honest generic captions (أجواء المساء / من المطبخ) and
 * descriptive alts; nothing pretends to be a specific real restaurant.
 *
 * Server component: pure markup; the reveal wrapper is the shared
 * RevealCssClass client belt. Images ride next/image, lazy by default
 * (below the fold), with real sizes; both frames melt into the ink
 * ground via the §26 inset veils.
 */
export function AmbienceSection() {
  return (
    <section id="ambience" className="ln-chapter ln-amb" aria-label="أجواء المطعم">
      <div className="ln-chapter-head">
        <span className="ln-label">{'05+ — الأجواء'}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          أجواء <em>تُروى كما هي</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          القهوة الليبية ليست مشروباً فحسب — مجلس وضيافة وسمر يمتد بعد
          المغرب. المنيو الرقمي ينقل هذا الإحساس كما هو، بلا فلتر وبلا مبالغة.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" className="ln-amb-grid" delay={2}>
        <div className="ln-amb-media ln-amb-media-lead">
          <Image
            src="/images/culinary/ambience.png"
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
            src="/images/culinary/kitchen.png"
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
          <span className="ln-amb-kicker ln-mono">من المطبخ إلى الطاولة</span>
          <p className="ln-amb-line">
            الطبق يُصنع في المطبخ، والرغبة تولد من الصورة. المنيو الرقمي يوصل
            أجواء مطعمك كما هي — صور أصنافك ووصفها ونبرة مطعمك تبقى كما كتبتها.
          </p>
          <p className="ln-amb-sub">
            كل صنف في منيوك يحمل صورته ووصفه وسعره الواضح، والعميل يقرأ القصة
            كاملة قبل أن يطلب — داخل المكان أو من بعيد.
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
