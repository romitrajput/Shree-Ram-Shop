"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { quickUpdateProduct } from "../actions";
import { ProductImage } from "@/components/ProductBits";
import { DeleteProduct } from "./DeleteProduct";

type P = { id: string; name: string; unit: string; image?: string; stock: number; discountPct: number; price: string; isActive: boolean };

/** Phone layout for the products list: stock and discount edited in place, saved automatically. */
export function StockCard({ p }: { p: P }) {
  const [stock, setStock] = useState(p.stock);
  const [discount, setDiscount] = useState(p.discountPct);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(() => {
      const fd = new FormData();
      fd.set("id", p.id);
      fd.set("stock", String(stock));
      fd.set("discountPct", String(discount));
      startTransition(async () => {
        try {
          await quickUpdateProduct(fd);
          setStatus("saved");
        } catch {
          setStatus("error");
        }
      });
    }, 700);
    return () => clearTimeout(t);
  }, [stock, discount, p.id]);

  return (
    <li className={`px-4 py-3 ${p.isActive ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-3">
        <Link href={`/admin/products/${p.id}`} className="flex min-w-0 items-center gap-3">
          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-paper-line">
            <ProductImage src={p.image} alt={p.name} />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">{p.name}</span>
            <span className="block text-sm text-ink-mute">
              {p.unit} · {p.price}
              {p.isActive ? "" : " · Hidden"}
            </span>
          </span>
        </Link>
        <span className="shrink-0 text-xs text-ink-mute" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? <span className="text-khata">Not saved</span> : ""}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-soft">Stock</span>
          <div className={`flex items-center rounded-full border bg-white ${stock <= 10 ? "border-khata" : "border-paper-line"}`} role="group" aria-label={`Stock of ${p.name}`}>
            <button type="button" className="h-11 w-11 text-xl disabled:opacity-40" aria-label="Reduce stock" disabled={stock <= 0} onClick={() => setStock((s) => Math.max(0, s - 1))}>
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={stock}
              onChange={(e) => setStock(Math.max(0, parseInt(e.target.value || "0", 10) || 0))}
              aria-label={`Stock of ${p.name}`}
              className="rate-num w-16 border-0 bg-transparent text-center font-semibold focus:outline-none"
            />
            <button type="button" className="h-11 w-11 text-xl" aria-label="Add stock" onClick={() => setStock((s) => s + 1)}>
              +
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          Discount
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={90}
            value={discount}
            onChange={(e) => setDiscount(Math.min(90, Math.max(0, parseInt(e.target.value || "0", 10) || 0)))}
            className="input rate-num !w-20 !py-2.5 text-center"
          />
          %
        </label>
      </div>
      <DeleteProduct id={p.id} name={p.name} />
    </li>
  );
}
