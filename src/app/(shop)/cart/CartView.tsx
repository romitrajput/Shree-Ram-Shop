"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { ProductImage } from "@/components/ProductBits";
import { rupees } from "@/lib/format";
import { OfferCodeField, useCouponPreview } from "@/components/OfferCode";

export function CartView({ shippingFee, freeShippingAbove }: { shippingFee: number; freeShippingAbove: number }) {
  const { items, subtotal, setQty, remove, ready } = useCart();
  const shipping = subtotal >= freeShippingAbove ? 0 : shippingFee;
  const toFree = Math.max(0, freeShippingAbove - subtotal);
  const coupon = useCouponPreview(subtotal, items.some((i) => i.mode === "CORPORATE"));
  const discount = coupon?.ok ? coupon.discount : 0;

  if (!ready) return <div className="container-x py-16" />;

  if (items.length === 0) {
    return (
      <div className="container-x py-16">
        <h1 className="text-4xl font-extrabold">Your cart is empty</h1>
        <p className="mt-3 text-ink-soft">Today&apos;s rates are on the shop page.</p>
        <Link href="/products" className="btn-primary mt-6">
          Shop dry fruits
        </Link>
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl font-extrabold">Your cart</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-paper-line border-y border-paper-line">
          {items.map((i) => (
            <li key={`${i.productId}-${i.mode}`} className="flex gap-4 py-5">
              <Link href={`/products/${i.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-paper-line">
                <ProductImage src={i.image} alt={i.name} />
              </Link>
              <div className="flex-1">
                <div className="flex justify-between gap-3">
                  <div>
                    <Link href={`/products/${i.slug}`} className="font-display text-lg font-bold hover:text-pista">
                      {i.name}
                    </Link>
                    <p className="text-sm text-ink-mute">
                      {i.unit} · {rupees(i.unitPrice)} each
                      {i.mode === "CORPORATE" ? <span className="ml-2 rounded bg-marigold-light px-1.5 text-ink">Bulk price, min. {i.moq}</span> : null}
                    </p>
                  </div>
                  <p className="rate-num font-semibold">{rupees(i.unitPrice * i.qty)}</p>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  {/* Steps of 10 for bulk lines, 1 for retail; never below the minimum order quantity */}
                  <div className="flex items-center rounded-full border border-paper-line bg-white" role="group" aria-label={`Quantity of ${i.name}`}>
                    <button
                      type="button"
                      className="h-11 w-11 text-xl disabled:opacity-40"
                      aria-label="Decrease quantity"
                      disabled={i.qty <= (i.mode === "CORPORATE" ? (i.moq ?? 1) : 1)}
                      onClick={() => setQty(i.productId, i.mode, i.qty - (i.mode === "CORPORATE" ? 10 : 1))}
                    >
                      −
                    </button>
                    <span className="rate-num min-w-10 text-center font-semibold" aria-live="polite">
                      {i.qty}
                    </span>
                    <button
                      type="button"
                      className="h-11 w-11 text-xl"
                      aria-label="Increase quantity"
                      onClick={() => setQty(i.productId, i.mode, i.qty + (i.mode === "CORPORATE" ? 10 : 1))}
                    >
                      +
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(i.productId, i.mode)} className="min-h-[44px] px-1 text-sm text-khata underline underline-offset-4">
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="card h-fit p-6">
          {toFree > 0 ? (
            <div className="mb-5">
              <p className="text-[15px]">
                Add <strong className="rate-num">{rupees(toFree)}</strong> more for free delivery
              </p>
              <div className="mt-2 h-2 rounded-full bg-paper" aria-hidden>
                <div className="h-2 rounded-full bg-marigold" style={{ width: `${Math.min(100, (subtotal / freeShippingAbove) * 100)}%` }} />
              </div>
            </div>
          ) : (
            <p className="mb-5 rounded-lg bg-pista-light px-3 py-2 text-[15px] text-pista-dark">Your order gets free delivery.</p>
          )}
          <div className="mb-4">
            <OfferCodeField result={coupon} />
          </div>
          <dl className="space-y-1 text-[15px]">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="rate-num">{rupees(subtotal)}</dd>
            </div>
            {discount ? (
              <div className="flex justify-between text-pista">
                <dt>Offer {coupon?.ok ? coupon.code : ""}</dt>
                <dd className="rate-num">−{rupees(discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd className="rate-num">{shipping === 0 ? "Free" : rupees(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-paper-line pt-2 text-lg font-bold">
              <dt>Total</dt>
              <dd className="rate-num">{rupees(subtotal - discount + shipping)}</dd>
            </div>
          </dl>
          <Link href="/checkout" className="btn-primary mt-5 w-full !py-3">
            Checkout
          </Link>
          <Link href="/products" className="mt-3 block text-center text-sm text-pista underline underline-offset-4">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
