import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/owner/", "/api/"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_DOMAIN || "https://smart-menu-uz6w.onrender.com"}/sitemap.xml`,
  }
}
