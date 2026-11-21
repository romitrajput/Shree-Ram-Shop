"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics-client";

export type PriceMode = "RETAIL" | "CORPORATE";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  unit: string;
  image?: string;
  mode: PriceMode;
  unitPrice: number; // paise — display only, the server re-prices every order
  qty: number;
  moq?: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: string, mode: PriceMode, qty: number) => void;
  remove: (productId: string, mode: PriceMode) => void;
  clear: () => void;
  /** Offer code entered in the cart; re-checked on the server when the order is placed */
  coupon: string | null;
  setCoupon: (code: string | null) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "srt_cart_v1";
const COUPON_KEY = "srt_coupon_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [coupon, setCouponState] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
      setCouponState(localStorage.getItem(COUPON_KEY));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.productId === item.productId && p.mode === item.mode);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], ...item, qty: next[i].qty + qty };
        return next;
      }
      return [...prev, { ...item, qty }];
    });
    track("add_to_cart", { productId: item.productId, value: item.unitPrice * qty });
  }, []);

  const setQty = useCallback((productId: string, mode: PriceMode, qty: number) => {
    setItems((prev) =>
      prev.map((p) => (p.productId === productId && p.mode === mode ? { ...p, qty: Math.max(p.moq && mode === "CORPORATE" ? p.moq : 1, qty) } : p))
    );
  }, []);

  const remove = useCallback((productId: string, mode: PriceMode) => {
    setItems((prev) => prev.filter((p) => !(p.productId === productId && p.mode === mode)));
    track("remove_from_cart", { productId });
  }, []);

  const setCoupon = useCallback((code: string | null) => {
    setCouponState(code);
    try {
      if (code) localStorage.setItem(COUPON_KEY, code);
      else localStorage.removeItem(COUPON_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setCoupon(null);
  }, [setCoupon]);

  const value = useMemo(
    () => ({
      items,
      ready,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((n, i) => n + i.qty * i.unitPrice, 0),
      add,
      setQty,
      remove,
      clear,
      coupon,
      setCoupon
    }),
    [items, ready, add, setQty, remove, clear, coupon, setCoupon]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
