"use client";

import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { checkCoupon } from "@/app/(shop)/actions";
import type { CouponResult } from "@/lib/coupons";

/** Re-checks the saved offer code whenever the cart changes. */
export function useCouponPreview(subtotal: number, hasBulkLines: boolean) {
  const { coupon } = useCart();
  const [result, setResult] = useState<CouponResult | null>(null);
  useEffect(() => {
    let live = true;
    if (!coupon || subtotal <= 0) {
      setResult(null);
      return;
    }
    checkCoupon(coupon, subtotal, hasBulkLines)
      .then((r) => live && setResult(r))
      .catch(() => live && setResult(null));
    return () => {
      live = false;
    };
  }, [coupon, subtotal, hasBulkLines]);
  return result;
}

/** Offer-code box for the cart summary. */
export function OfferCodeField({ result }: { result: CouponResult | null }) {
  const { coupon, setCoupon } = useCart();
  const [code, setCode] = useState("");

  if (coupon) {
    return (
      <div className="rounded-lg bg-paper px-3 py-2 text-[15px]">
        <div className="flex items-center justify-between gap-3">
          <span>
            Offer code <strong>{coupon}</strong>
            {result?.ok ? <span className="text-pista"> · {result.label}</span> : null}
          </span>
          <button type="button" aria-label={`Remove offer code ${coupon}`} className="min-h-[44px] px-1 text-sm text-khata underline underline-offset-4" onClick={() => setCoupon(null)}>
            Remove
          </button>
        </div>
        {result && !result.ok ? (
          <p className="text-sm text-khata" role="alert">
            {result.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) setCoupon(code.trim().toUpperCase());
      }}
    >
      <label htmlFor="offer-code" className="sr-only">
        Offer code
      </label>
      <input
        id="offer-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Offer code"
        autoCapitalize="characters"
        autoComplete="off"
        className="input uppercase placeholder:normal-case"
      />
      <button type="submit" className="btn-ghost shrink-0">
        Apply
      </button>
    </form>
  );
}
