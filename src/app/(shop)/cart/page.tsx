import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const s = await getSettings();
  return <CartView shippingFee={s.shippingFee} freeShippingAbove={s.freeShippingAbove} />;
}
