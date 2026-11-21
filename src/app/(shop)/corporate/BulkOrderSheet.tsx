"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { rupees } from "@/lib/format";

export type BulkRow = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  image?: string;
  retail: number;
  bulk: number;
  moq: number;
  stock: number;
};

/**
 * Bulk rates as an order sheet: pick quantities for several products and add
 * them all to the cart at bulk prices in one go. A row is either 0 (not
 * ordering) or at least the product's MOQ.
 */
export function BulkOrderSheet({ rows }: { rows: BulkRow[] }) {
  const { add } = useCart();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [added, setAdded] = useState<number | null>(null);

  const step = (r: BulkRow, dir: 1 | -1) => {
    setAdded(null);
    setQty((q) => {
      const cur = q[r.id] ?? 0;
      let next = dir === 1 ? (cur === 0 ? r.moq : cur + 10) : cur - 10 < r.moq ? 0 : cur - 10;
      next = Math.min(next, r.stock);
      if (next > 0 && next < r.moq) next = 0;
      return { ...q, [r.id]: next };
    });
  };

  const chosen = rows.filter((r) => (qty[r.id] ?? 0) > 0);
  const total = useMemo(() => chosen.reduce((s, r) => s + r.bulk * qty[r.id], 0), [chosen, qty]);
  const saving = useMemo(() => chosen.reduce((s, r) => s + (r.retail - r.bulk) * qty[r.id], 0), [chosen, qty]);

  function addAll() {
    for (const r of chosen) {
      add({ productId: r.id, slug: r.slug, name: r.name, unit: r.unit, image: r.image, mode: "CORPORATE", unitPrice: r.bulk, moq: r.moq }, qty[r.id]);
    }
    setAdded(chosen.length);
    setQty({});
  }

  return (
    <div className="mt-6">
      <ul className="divide-y divide-paper-line rounded-tile border border-paper-line bg-white">
        {rows.map((r) => {
          const q = qty[r.id] ?? 0;
          const soldOut = r.stock < r.moq;
          return (
            <li key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[1.6fr_1fr_auto]">
              <div className="min-w-0">
                <Link href={`/products/${r.slug}?buy=bulk`} className="font-medium hover:text-pista">
                  {r.name}
                </Link>
                <p className="text-sm text-ink-soft">
                  {r.unit} · min. {r.moq} packs
                </p>
              </div>
              <p className="rate-num col-start-1 row-start-2 text-[15px] sm:col-start-2 sm:row-start-1">
                <strong className="text-pista">{rupees(r.bulk)}</strong> <s className="text-sm text-ink-mute">{rupees(r.retail)}</s>
                <span className="text-sm text-ink-soft"> per pack</span>
              </p>
              {soldOut ? (
                <p className="row-span-2 text-sm font-medium text-khata sm:row-span-1">Ask for a quote</p>
              ) : (
                <div className="row-span-2 flex items-center rounded-full border border-paper-line sm:row-span-1" role="group" aria-label={`Packs of ${r.name}`}>
                  <button type="button" className="h-11 w-11 text-xl disabled:opacity-40" aria-label={`Fewer packs of ${r.name}`} disabled={q === 0} onClick={() => step(r, -1)}>
                    −
                  </button>
                  <span className="rate-num min-w-12 text-center font-semibold" aria-live="polite">
                    {q}
                  </span>
                  <button type="button" className="h-11 w-11 text-xl disabled:opacity-40" aria-label={`More packs of ${r.name}`} disabled={q >= r.stock} onClick={() => step(r, 1)}>
                    +
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-tile border border-paper-line bg-white/95 p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
        {added !== null ? (
          <p role="status" className="text-[15px]">
            Added {added} {added === 1 ? "product" : "products"} at bulk prices.{" "}
            <Link href="/cart" className="font-semibold text-pista underline">
              Go to cart
            </Link>
          </p>
        ) : chosen.length ? (
          <p className="rate-num text-[15px]">
            {chosen.length} {chosen.length === 1 ? "product" : "products"} · <strong>{rupees(total)}</strong>
            <span className="text-sm text-pista"> (you save {rupees(saving)})</span>
          </p>
        ) : (
          <p className="text-[15px] text-ink-soft">Tap + to add a product at its minimum quantity.</p>
        )}
        <button type="button" className="btn-primary min-h-[48px]" disabled={!chosen.length} onClick={addAll}>
          Add all to cart
        </button>
      </div>
    </div>
  );
}
