import Link from "next/link";
import { rupees } from "@/lib/format";
import type { ProductCardData } from "@/lib/catalog";
import { QuickAdd } from "./QuickAdd";

/** Product photo, or a tidy placeholder until the owner uploads one. */
export function ProductImage({ src, alt, className = "" }: { src?: string | null; alt: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  return (
    <div className={`flex h-full w-full items-center justify-center bg-pista-light ${className}`} role="img" aria-label={alt}>
      <span className="font-display text-5xl font-extrabold text-pista/30">{alt.slice(0, 1)}</span>
    </div>
  );
}

export function Stars({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-ink-soft" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} width={size} height={size} viewBox="0 0 20 20">
            <defs>
              <linearGradient id={`half-${i}`}>
                <stop offset="50%" stopColor="#F2A900" />
                <stop offset="50%" stopColor="#E6E1D6" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8z"
              fill={rounded >= i ? "#F2A900" : rounded >= i - 0.5 ? `url(#half-${i})` : "#E6E1D6"}
            />
          </svg>
        ))}
      </span>
      {count !== undefined ? <span className="rate-num">({count})</span> : null}
    </span>
  );
}

export function Price({ price, mrp, discountPct, large = false }: { price: number; mrp: number; discountPct: number; large?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={`rate-num font-display font-bold text-ink ${large ? "text-3xl" : "text-lg"}`}>{rupees(price)}</span>
      {discountPct > 0 ? (
        <>
          <s className="rate-num text-sm text-ink-mute">{rupees(mrp)}</s>
          <span className="rounded bg-khata-light px-1.5 text-sm font-semibold text-khata">{discountPct}% off</span>
        </>
      ) : null}
    </span>
  );
}

export function ProductCard({ p, mode = "RETAIL" }: { p: ProductCardData; mode?: "RETAIL" | "CORPORATE" }) {
  const corporate = mode === "CORPORATE" && p.corporateEnabled && p.corporatePrice;
  return (
    <div className="flex flex-col">
      <Link href={`/products/${p.slug}${corporate ? "?buy=bulk" : ""}`} className="group block flex-1">
        <div className="aspect-[4/5] overflow-hidden rounded-tile border border-paper-line bg-white">
          <ProductImage src={p.images[0]?.url} alt={p.images[0]?.alt || p.name} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-sm text-ink-mute">
            {p.unit}
            {p.origin ? `, ${p.origin}` : ""}
          </p>
          <h3 className="font-display text-lg font-bold leading-snug group-hover:text-pista">{p.name}</h3>
          {p.ratingCount > 0 ? <Stars value={p.ratingAvg} count={p.ratingCount} /> : null}
          {corporate ? (
            <p>
              <span className="rate-num font-display text-lg font-bold">{rupees(p.corporatePrice!)}</span>
              <span className="text-sm text-ink-soft"> per pack, min. {p.moq} packs</span>
            </p>
          ) : (
            <Price price={p.price} mrp={p.mrp} discountPct={p.discountPct} />
          )}
          {p.stock > 0 && p.stock <= 10 ? <p className="text-sm font-medium text-khata">Only {p.stock} left</p> : null}
        </div>
      </Link>
      {corporate ? null : (
        <QuickAdd p={{ id: p.id, slug: p.slug, name: p.name, unit: p.unit, image: p.images[0]?.url, price: p.price, stock: p.stock }} />
      )}
    </div>
  );
}
