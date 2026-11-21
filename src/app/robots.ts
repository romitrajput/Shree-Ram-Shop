import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.APP_ENV !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  const site = process.env.SITE_URL || "";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/cart", "/checkout", "/order"] },
    sitemap: `${site}/sitemap.xml`
  };
}
