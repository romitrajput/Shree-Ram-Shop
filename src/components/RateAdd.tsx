"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

type P = { id: string; slug: string; name: string; unit: string; image?: string; price: number; stock: number };

/** Compact "Add" on the home page rate board (dark background). */
export function RateAdd({ p }: { p: P }) {
  const { add, items } = useCart();
  const [flash, setFlash] = useState(false);
  const inCart = items.find((i) => i.productId === p.id && i.mode === "RETAIL")?.qty ?? 0;
  if (p.stock <= 0) return <span className="w-16 text-right text-xs text-white/60">Sold out</span>;
  return (
    <button
      type="button"
      onClick={() => {
        add({ productId: p.id, slug: p.slug, name: p.name, unit: p.unit, image: p.image, mode: "RETAIL", unitPrice: p.price }, 1);
        setFlash(true);
        setTimeout(() => setFlash(false), 1500);
      }}
      disabled={inCart >= p.stock}
      aria-label={`Add ${p.name} (${p.unit}) to cart${inCart ? `, ${inCart} in cart` : ""}`}
      className="min-h-[44px] w-16 shrink-0 rounded-full border border-white/30 text-sm font-semibold text-white transition-colors hover:border-marigold hover:text-marigold disabled:opacity-50"
    >
      {flash ? "Added" : inCart ? `+1 (${inCart})` : "Add"}
    </button>
  );
}
