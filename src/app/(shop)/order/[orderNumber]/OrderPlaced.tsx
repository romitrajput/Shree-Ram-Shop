"use client";

import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import { track } from "@/lib/analytics-client";

/** Runs once after checkout: empties the cart and records the conversion. */
export function OrderPlaced({ orderNumber, total }: { orderNumber: string; total: number }) {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (!ready) return;
    clear();
    const key = `srt_tracked_${orderNumber}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    track("order_placed", { value: total });
  }, [ready, clear, orderNumber, total]);
  return null;
}
