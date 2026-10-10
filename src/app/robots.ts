import type { MetadataRoute } from "next"
import { SITE_ORIGIN } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // r121-L-2: the print-path entry is removed from the disallow list — the
      // print page now serves its own noindex + self-canonical (print
      // generateMetadata), and a robots.txt-blocked URL can never be seen
      // crawling that noindex ("Indexed, though blocked" recipe).
      // r138 (F8): /cart + /order-confirmed leave the disallow list for the
      // same reason — both already serve page-level noindex (crawlable via
      // direct hit, so Google sees the noindex instead of the "Indexed,
      // though blocked" limbo the old pair produced).
      disallow: ["/admin/", "/owner/", "/api/"],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`, // r126 (M7): unified origin
  }
}
