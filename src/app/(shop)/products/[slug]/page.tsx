import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/catalog";
import { Stars } from "@/components/ProductBits";
import { TrackOnMount } from "@/components/PageTracker";
import { Gallery } from "./Gallery";
import { BuyBox } from "./BuyBox";
import { ReviewForm } from "./ReviewForm";
import { DeliveryCheck } from "./DeliveryCheck";
import { getSettings } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ buy?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  return {
    title: `${p.name} (${p.unit})`,
    description: p.shortDescription || p.description.slice(0, 155),
    openGraph: { images: p.images[0] ? [p.images[0].url] : [] }
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const wantsBulk = (await searchParams).buy === "bulk";
  const settings = await getSettings();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.shortDescription || p.description,
    image: p.images.map((i) => i.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (p.price / 100).toFixed(2),
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    },
    ...(p.ratingCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.ratingAvg.toFixed(1), reviewCount: p.ratingCount } } : {})
  };

  return (
    <div className="container-x py-8">
      <TrackOnMount type="product_view" productId={p.id} value={p.price} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav className="text-sm text-ink-mute" aria-label="Breadcrumb">
        <Link href="/products" className="hover:underline">
          Shop
        </Link>
        {p.category ? (
          <>
            {" / "}
            <Link href={`/products?category=${p.category.slug}`} className="hover:underline">
              {p.category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="mt-4 grid gap-10 md:grid-cols-2">
        <Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt || p.name }))} name={p.name} />

        <div>
          <h1 className="text-4xl font-extrabold">{p.name}</h1>
          <p className="mt-2 text-ink-soft">
            {p.unit}
            {p.origin ? ` · Origin: ${p.origin}` : ""}
          </p>
          {p.ratingCount > 0 ? (
            <a href="#reviews" className="mt-2 inline-block">
              <Stars value={p.ratingAvg} count={p.ratingCount} size={16} />
            </a>
          ) : null}
          {p.shortDescription ? <p className="mt-4 text-lg">{p.shortDescription}</p> : null}

          <BuyBox
            initialMode={wantsBulk && p.corporateEnabled ? "CORPORATE" : "RETAIL"}
            product={{
              id: p.id,
              slug: p.slug,
              name: p.name,
              unit: p.unit,
              image: p.images[0]?.url,
              price: p.price,
              mrp: p.mrp,
              discountPct: p.discountPct,
              stock: p.stock,
              corporateEnabled: p.corporateEnabled,
              corporatePrice: p.corporatePrice,
              moq: p.moq
            }}
          />

          <DeliveryCheck
            settings={{
              localPinPrefixes: settings.localPinPrefixes,
              localDays: settings.localDays,
              otherDays: settings.otherDays,
              freeShippingAbove: settings.freeShippingAbove,
              codEnabled: settings.codEnabled
            }}
          />

          {p.description ? (
            <div className="mt-8 border-t border-paper-line pt-6">
              <h2 className="text-xl font-bold">About this product</h2>
              <div className="mt-3 max-w-prose whitespace-pre-line text-[15px] text-ink-soft">{p.description}</div>
            </div>
          ) : null}
        </div>
      </div>

      <section id="reviews" className="mt-16 grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-2xl font-bold">Reviews</h2>
          {p.reviews.length === 0 ? (
            <p className="mt-3 text-ink-soft">No reviews yet. Bought this before? Your review helps other buyers.</p>
          ) : (
            <ul className="mt-4 space-y-6">
              {p.reviews.map((r) => (
                <li key={r.id} className="border-b border-paper-line pb-6">
                  <Stars value={r.rating} />
                  {r.title ? <p className="mt-2 font-semibold">{r.title}</p> : null}
                  <p className="mt-1 text-[15px]">{r.body}</p>
                  <p className="mt-2 text-sm text-ink-mute">
                    {r.name}
                    {r.city ? `, ${r.city}` : ""} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(r.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <ReviewForm productId={p.id} />
      </section>
    </div>
  );
}
