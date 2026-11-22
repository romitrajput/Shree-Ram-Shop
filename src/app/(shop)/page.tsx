import Link from "next/link";
import { db } from "@/lib/db";
import { rupees } from "@/lib/format";
import { Stars } from "@/components/ProductBits";
import { getSettings } from "@/lib/settings";
import { RateAdd } from "@/components/RateAdd";

export default async function HomePage() {
  const [rateBoard, categories, reviews, settings] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      // Newest first, so a product the owner just added shows up straight away.
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true, name: true, slug: true, unit: true, price: true, mrp: true, discountPct: true, stock: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } }
      }
    }),
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
          <div className="mt-8">
            <Link href="/products" className="btn-primary !px-7 !py-3">
              Shop dry fruits
            </Link>
          </div>
          {categories.length > 0 ? (
            <nav className="mt-8 flex flex-wrap items-center gap-2" aria-label="Shop by category">
              {categories.map((c) => (
                <Link key={c.id} href={`/products?category=${c.slug}`} className="rounded-full border border-paper-line bg-white px-4 py-2 text-[15px] hover:border-pista">
                  {c.name} <span className="text-ink-mute">{c._count.products}</span>
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <div data-wa-avoid className="rounded-[22px] bg-pista p-6 text-white shadow-[0_24px_60px_-30px_rgba(31,51,32,0.7)] sm:p-8">
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

      <div className="container-x">
        <Link href="/products" className="btn-ghost w-full md:w-auto md:!px-7">
          See all products
        </Link>
      </div>

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
