import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const cardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
  category: { select: { name: true, slug: true } }
} satisfies Prisma.ProductInclude;

export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export type ProductSort = "popular" | "price_asc" | "price_desc" | "discount" | "new";

export async function listProducts(opts: { q?: string; category?: string; sort?: ProductSort; corporate?: boolean } = {}) {
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (opts.category) where.category = { slug: opts.category };
  if (opts.corporate) where.corporateEnabled = true;
  if (opts.q) {
    const q = opts.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
      { origin: { contains: q, mode: "insensitive" } }
    ];
  }
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    opts.sort === "price_asc"
      ? [{ price: "asc" }]
      : opts.sort === "price_desc"
        ? [{ price: "desc" }]
        : opts.sort === "discount"
          ? [{ discountPct: "desc" }]
          : opts.sort === "new"
            ? [{ createdAt: "desc" }]
            : [{ isFeatured: "desc" }, { ratingCount: "desc" }, { name: "asc" }];

  return db.product.findMany({ where, orderBy, include: cardInclude });
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: true,
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 30 }
    }
  });
}

/** Recompute a product's average rating from approved reviews. */
export async function refreshRating(productId: string) {
  const agg = await db.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: true
  });
  await db.product.update({
    where: { id: productId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count }
  });
}
