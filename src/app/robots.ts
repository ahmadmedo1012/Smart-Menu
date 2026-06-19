import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/owner/", "/api/", "/cart", "/login", "/demo"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
