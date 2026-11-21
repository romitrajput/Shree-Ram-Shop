"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

type P = { id: string; slug: string; name: string; unit: string; image?: string; price: number; stock: number };

/** One-tap "Add to cart" on product cards, so phone shoppers don't have to open every product. */
export function QuickAdd({ p }: { p: P }) {
  const { add, items } = useCart();
  const inCart = items.find((i) => i.productId === p.id && i.mode === "RETAIL")?.qty ?? 0;

  if (p.stock <= 0) {
    return (
      <button type="button" disabled className="btn-ghost mt-2 w-full !py-2 text-sm">
        Out of stock
      </button>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => add({ productId: p.id, slug: p.slug, name: p.name, unit: p.unit, image: p.image, mode: "RETAIL", unitPrice: p.price }, 1)}
        disabled={inCart >= p.stock}
        aria-label={`Add ${p.name} (${p.unit}) to cart`}
        className="btn-ghost min-h-[44px] flex-1 !py-2 text-sm hover:!border-pista hover:text-pista"
      >
        {inCart ? "Add one more" : "Add to cart"}
      </button>
      {inCart ? (
        <Link href="/cart" className="rate-num min-h-[44px] content-center whitespace-nowrap rounded-full bg-pista-light px-3 text-sm font-semibold text-pista-dark" aria-label={`${inCart} in cart, view cart`}>
          {inCart} in cart
        </Link>
      ) : null}
    </div>
  );
}
