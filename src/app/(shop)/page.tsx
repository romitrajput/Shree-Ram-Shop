import Link from "next/link";
import { db } from "@/lib/db";
import { cardInclude } from "@/lib/catalog";
import { rupees } from "@/lib/format";
import { ProductCard, Stars } from "@/components/ProductBits";
import { getSettings } from "@/lib/settings";
import { RateAdd } from "@/components/RateAdd";

export default async function HomePage() {
  const [rateBoard, featured, categories, reviews, settings] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: "desc" }, { ratingCount: "desc" }],
      take: 7,
      select: {
        id: true, name: true, slug: true, unit: true, price: true, mrp: true, discountPct: true, stock: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } }
      }
    }),
    db.product.findMany({ where: { isActive: true, isFeatured: true }, include: cardInclude, take: 8 }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: { where: { isActive: true } } } } } }),
    db.review.findMany({
      where: { status: "APPROVED", rating: { gte: 4 } },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { product: { select: { name: true, slug: true } } }
    }),
    getSettings()
  ]);

  const today = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long" }).format(new Date());

  return (
    <>
      {/* Hero: the shop's rate board is the centrepiece — it's what a dry-fruit trader shows first. */}
      <section className="container-x grid items-center gap-10 py-12 md:grid-cols-[1fr_1.05fr] md:py-20">
        <div>
          <h1 className="text-[2.6rem] font-extrabold sm:text-6xl">Dry fruits at trader prices, packed fresh every week.</h1>
          <p className="mt-5 max-w-md text-lg text-ink-soft">
            Almonds, cashews, pistachios and more, sorted and sealed in our own godown. Order a 250 g pack for home or 500 boxes for Diwali gifting.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="btn-primary !px-7 !py-3">
              Shop dry fruits
            </Link>
            <Link href="/corporate" className="btn-ghost !px-7 !py-3">
              Bulk & corporate orders
            </Link>
          </div>
        </div>

        <div className="rounded-[22px] bg-pista p-6 text-white shadow-[0_24px_60px_-30px_rgba(31,51,32,0.7)] sm:p-8">
          <div className="flex items-baseline justify-between border-b border-white/15 pb-4">
            <h2 className="font-display text-2xl font-bold text-white">Today&apos;s rates</h2>
            <p className="text-sm text-white/70">{today}</p>
          </div>
          {rateBoard.length === 0 ? (
            <p className="py-10 text-white/70">Rates appear here once products are added in the admin panel.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {rateBoard.map((r) => (
                <li key={r.slug} className="flex items-center gap-3">
                  <Link href={`/products/${r.slug}`} className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-baseline gap-x-4 py-3 hover:text-marigold">
                    <span className="min-w-0">
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-2 text-sm text-white/60">{r.unit}</span>
                    </span>
                    <span className="rate-num text-right">
                      {r.discountPct > 0 ? <s className="mr-2 hidden text-sm text-white/50 sm:inline">{rupees(r.mrp)}</s> : null}
                      <span className="font-display text-xl font-bold text-marigold">{rupees(r.price)}</span>
                    </span>
                  </Link>
                  <RateAdd p={{ id: r.id, slug: r.slug, name: r.name, unit: r.unit, image: r.images[0]?.url, price: r.price, stock: r.stock }} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-white/70">Prices include GST. Free delivery on orders above {rupees(settings.freeShippingAbove)}.</p>
        </div>
      </section>

      {categories.length > 0 ? (
        <section className="container-x">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 font-body text-[15px] font-medium text-ink-soft">Shop by category</h2>
            {categories.map((c) => (
              <Link key={c.id} href={`/products?category=${c.slug}`} className="rounded-full border border-paper-line bg-white px-4 py-2 text-[15px] hover:border-pista">
                {c.name} <span className="text-ink-mute">{c._count.products}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section className="container-x mt-14">
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-bold">Most ordered this month</h2>
            <Link href="/products" className="hidden font-medium text-pista underline underline-offset-4 md:inline">
              See all products
            </Link>
          </div>
          {/* Phones show the top 4 (the rate board above already lists the rest) */}
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 [&>*:nth-child(n+5)]:hidden md:[&>*:nth-child(n+5)]:flex">
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          <Link href="/products" className="btn-ghost mt-8 w-full md:hidden">
            See all products
          </Link>
        </section>
      ) : null}

      <section className="mt-20 bg-marigold-light">
        <div className="container-x grid gap-8 py-14 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Buying for an office, hotel or sweet shop?</h2>
            <p className="mt-4 max-w-lg text-lg text-ink-soft">
              Corporate prices start from a minimum order quantity on each product. You get a GST invoice, custom gift boxes on request and one
              person to call for every order.
            </p>
            <Link href="/corporate" className="btn-primary mt-6 !px-7 !py-3">
              See corporate prices
            </Link>
          </div>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {[
              ["GST invoice", "Claim input credit on every order"],
              ["Gift boxes", "Branded packing for Diwali and events"],
              ["Fixed rates", "Price locked for the quantity you quote"],
              ["Pan-India", "Delivered to multiple office locations"]
            ].map(([t, d]) => (
              <div key={t} className="border-t border-ink/15 py-4">
                <dt className="font-display text-lg font-bold">{t}</dt>
                <dd className="mt-1 text-[15px] text-ink-soft">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {reviews.length > 0 ? (
        <section className="container-x mt-20">
          <h2 className="text-3xl font-bold">What customers say</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="card p-6">
                <Stars value={r.rating} />
                <blockquote className="mt-3 text-[15px] text-ink">{r.body}</blockquote>
                <figcaption className="mt-4 text-sm text-ink-soft">
                  {r.name}
                  {r.city ? `, ${r.city}` : ""} on{" "}
                  <Link className="underline" href={`/products/${r.product.slug}`}>
                    {r.product.name}
                  </Link>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
