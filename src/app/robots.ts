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
      // crawling that noindex ("Indexed, though blocked" recipe). /cart +
      // /order-confirmed stay for the L-6 batch (their noindex is page-level
      // and crawlable via direct hit).
      disallow: ["/admin/", "/owner/", "/api/", "/cart", "/order-confirmed"],
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`, // r126 (M7): unified origin
  }
}
