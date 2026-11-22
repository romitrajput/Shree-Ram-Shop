"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart, type PriceMode } from "@/components/CartProvider";
import { Price } from "@/components/ProductBits";
import { rupees } from "@/lib/format";

type P = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  image?: string;
  price: number;
  mrp: number;
  discountPct: number;
  stock: number;
  corporateEnabled: boolean;
  corporatePrice: number | null;
  moq: number | null;
};

export function BuyBox({ product: p, initialMode }: { product: P; initialMode: PriceMode }) {
  const { add } = useCart();
  // Retail shoppers never see bulk pricing; corporate buyers arrive from /corporate with ?buy=bulk.
  const bulkAvailable = initialMode === "CORPORATE" && p.corporateEnabled && !!p.corporatePrice && !!p.moq;
  const [mode, setMode] = useState<PriceMode>(bulkAvailable ? initialMode : "RETAIL");
  const minQty = mode === "CORPORATE" ? p.moq! : 1;
  const [qty, setQty] = useState(minQty);
  const [added, setAdded] = useState(false);
  const unitPrice = mode === "CORPORATE" ? p.corporatePrice! : p.price;
  const outOfStock = p.stock < minQty;
  const addRef = useRef<HTMLButtonElement>(null);
  const [showBar, setShowBar] = useState(false);

  // On phones, keep an "Add to cart" bar on screen once the main button has scrolled
  // above the viewport. (A scroll listener, not IntersectionObserver: a fast fling can
  // jump straight past the button without crossing an intersection threshold.)
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = addRef.current;
      if (el) setShowBar(el.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  function addToCart() {
    add({ productId: p.id, slug: p.slug, name: p.name, unit: p.unit, image: p.image, mode, unitPrice, moq: p.moq ?? undefined }, qty);
    setAdded(true);
  }

  function switchMode(m: PriceMode) {
    setMode(m);
    setQty(m === "CORPORATE" ? p.moq! : 1);
    setAdded(false);
  }

  return (
    <div className="mt-6 rounded-tile border border-paper-line bg-white p-5">
      {bulkAvailable ? (
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-paper p-1" role="group" aria-label="Buying for">
          {(["RETAIL", "CORPORATE"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => switchMode(m)}
              className={`min-h-[44px] rounded-full text-sm font-semibold transition-colors ${mode === m ? "bg-pista text-white" : "text-ink-soft hover:text-ink"}`}
            >
              {m === "RETAIL" ? "For home" : `Bulk (${p.moq}+ packs)`}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "RETAIL" ? (
        <Price price={p.price} mrp={p.mrp} discountPct={p.discountPct} large />
      ) : (
        <div>
          <span className="rate-num font-display text-3xl font-bold">{rupees(p.corporatePrice!)}</span>
          <span className="ml-2 text-ink-soft">per pack</span>
          <p className="mt-1 text-sm text-pista">
            You save {rupees(p.price - p.corporatePrice!)} per pack compared to the retail price. Minimum {p.moq} packs.
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-paper-line">
          <button type="button" className="h-11 w-11 text-xl disabled:opacity-40" aria-label="Decrease quantity" disabled={qty <= minQty} onClick={() => setQty((q) => Math.max(minQty, q - (mode === "CORPORATE" ? 10 : 1)))}>
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={minQty}
            max={p.stock}
            value={qty}
            onChange={(e) => setQty(Math.max(minQty, parseInt(e.target.value || "0", 10) || minQty))}
            className="rate-num w-16 border-0 bg-transparent text-center font-semibold focus:outline-none"
            aria-label="Quantity"
          />
          <button type="button" className="h-11 w-11 text-xl disabled:opacity-40" aria-label="Increase quantity" disabled={qty >= p.stock} onClick={() => setQty((q) => Math.min(p.stock, q + (mode === "CORPORATE" ? 10 : 1)))}>
            +
          </button>
        </div>
        <button
          className="btn-primary flex-1 !py-3"
          disabled={outOfStock || qty > p.stock}
          ref={addRef}
          onClick={addToCart}
        >
          {outOfStock ? "Out of stock" : `Add to cart · ${rupees(unitPrice * qty)}`}
        </button>
      </div>
      {qty > p.stock && !outOfStock ? (
        <p className="mt-2 text-sm text-khata">Only {p.stock} packs in stock.</p>
      ) : p.stock > 0 && p.stock <= 10 && mode === "RETAIL" ? (
        <p className="mt-2 text-sm font-medium text-khata">Only {p.stock} left in stock</p>
      ) : null}
      {added ? (
        <p className="mt-3 text-[15px]" role="status">
          Added to your cart.{" "}
          <Link href="/cart" className="font-semibold text-pista underline">
            Go to cart
          </Link>
        </p>
      ) : null}
      {mode === "CORPORATE" ? (
        <p className="mt-4 text-sm text-ink-soft">
          Need custom packing or more than {p.stock} packs?{" "}
          <Link className="text-pista underline" href="/corporate#enquiry">
            Request a quote
          </Link>
        </p>
      ) : null}

      {showBar && !outOfStock ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-paper-line bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink-soft">
                {p.name} · {qty} × {p.unit}
              </p>
              <p className="rate-num font-display text-lg font-bold">{rupees(unitPrice * qty)}</p>
            </div>
            {added ? (
              <Link href="/cart" className="btn-primary min-h-[48px]">
                View cart
              </Link>
            ) : (
              <button type="button" onClick={addToCart} className="btn-primary min-h-[48px]" disabled={qty > p.stock}>
                Add to cart
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
