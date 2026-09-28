import type { MetadataRoute } from "next"

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
    sitemap: `${process.env.NEXT_PUBLIC_DOMAIN || "https://smart-link.ly"}/sitemap.xml`,
  }
}
