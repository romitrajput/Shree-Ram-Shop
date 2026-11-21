import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.SITE_URL || "http://localhost:3000";
  const products = await db.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } });
  return [
    { url: `${site}/`, changeFrequency: "daily", priority: 1 },
    { url: `${site}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/corporate`, changeFrequency: "weekly", priority: 0.8 },
    ...products.map((p) => ({ url: `${site}/products/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 }))
  ];
}
