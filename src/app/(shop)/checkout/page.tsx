import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const s = await getSettings();
  return (
    <div className="container-x py-10">
      <h1 className="text-4xl font-extrabold">Checkout</h1>
      <p className="mt-2 text-ink-soft">
        {s.codEnabled ? "Pay by UPI (GPay, PhonePe, Paytm) or cash on delivery." : "After you place the order you'll pay by UPI: GPay, PhonePe, Paytm or any UPI app."}
      </p>
      <CheckoutForm
        settings={{
          shippingFee: s.shippingFee,
          freeShippingAbove: s.freeShippingAbove,
          codEnabled: s.codEnabled,
          codLimit: s.codLimit,
          codFee: s.codFee,
          localPinPrefixes: s.localPinPrefixes,
          localDays: s.localDays,
          otherDays: s.otherDays
        }}
      />
    </div>
  );
}
