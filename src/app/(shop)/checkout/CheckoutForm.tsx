"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { keepValues, useFocusFirstError, Field, FieldError, FormError, Submit } from "@/components/Form";
import { useCouponPreview } from "@/components/OfferCode";
import { getSession, track } from "@/lib/analytics-client";
import { rupees } from "@/lib/format";
import { deliveryDays, stateForPin } from "@/lib/delivery";
import { placeOrder, saveCheckoutLead, type FormState } from "../actions";

const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];

export type CheckoutSettings = {
  shippingFee: number;
  freeShippingAbove: number;
  codEnabled: boolean;
  codLimit: number;
  codFee: number;
  localPinPrefixes: string;
  localDays: string;
  otherDays: string;
};

export function CheckoutForm({ settings: s }: { settings: CheckoutSettings }) {
  const { items, subtotal, ready, coupon: savedCoupon } = useCart();
  const [state, action, busy] = useActionState<FormState, FormData>(placeOrder, undefined);
  const [sessionId, setSessionId] = useState("");
  const [payment, setPayment] = useState<"UPI" | "COD">("UPI");
  const [pinNote, setPinNote] = useState("");
  const stateRef = useRef<HTMLSelectElement>(null);
  const savedLead = useRef("");
  const isCorporate = items.some((i) => i.mode === "CORPORATE");
  const shipping = subtotal >= s.freeShippingAbove ? 0 : s.shippingFee;
  const coupon = useCouponPreview(subtotal, isCorporate);
  const discount = coupon?.ok ? coupon.discount : 0;
  const beforeCod = subtotal - discount + shipping;
  const codOffered = s.codEnabled && !isCorporate && beforeCod <= s.codLimit;
  const cod = codOffered && payment === "COD";
  const total = beforeCod + (cod ? s.codFee : 0);
  const e = state?.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(state, formRef);
  const itemCount = items.reduce((n, i) => n + i.qty, 0);

  useEffect(() => {
    if (!ready || items.length === 0) return;
    setSessionId(getSession().sessionId);
    track("begin_checkout", { value: subtotal });
    // Fire once per visit to checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (!codOffered && payment === "COD") setPayment("UPI");
  }, [codOffered, payment]);

  // Reuse the PIN the shopper checked on a product page
  useEffect(() => {
    if (!ready) return;
    try {
      const pin = localStorage.getItem("srt_pin");
      const input = formRef.current?.elements.namedItem("pincode") as HTMLInputElement | null;
      if (pin && input && !input.value) {
        input.value = pin;
        onPin(pin);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /** Remember the number once it's valid, so the shop can help if checkout isn't finished. */
  function rememberLead() {
    const form = formRef.current;
    if (!form || !sessionId) return;
    const phone = String(new FormData(form).get("phone") || "").replace(/[\s-]/g, "").replace(/^\+?91/, "");
    if (!/^[6-9]\d{9}$/.test(phone) || savedLead.current === phone) return;
    savedLead.current = phone;
    const name = String(new FormData(form).get("name") || "");
    saveCheckoutLead({ sessionId, phone, name, subtotal, cart: items.map((i) => ({ name: i.name, unit: i.unit, qty: i.qty, mode: i.mode })) }).catch(() => undefined);
  }

  function onPin(pin: string) {
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setPinNote("");
      return;
    }
    const st = stateForPin(pin);
    if (st && stateRef.current && !stateRef.current.value) stateRef.current.value = st;
    setPinNote(`Delivery in about ${deliveryDays(pin, s)} days after dispatch.`);
  }

  if (ready && items.length === 0) {
    return (
      <p className="mt-8">
        Your cart is empty.{" "}
        <Link className="text-pista underline" href="/products">
          Continue shopping
        </Link>
      </p>
    );
  }

  return (
    <form ref={formRef} onSubmit={keepValues(action)} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <p className="rate-num flex justify-between rounded-tile bg-white px-4 py-3 text-[15px] ring-1 ring-paper-line lg:hidden">
          <span>
            {itemCount} {itemCount === 1 ? "item" : "items"}
            {shipping === 0 ? " · free delivery" : ` · delivery ${rupees(shipping)}`}
            {discount ? ` · offer −${rupees(discount)}` : ""}
          </span>
          <strong>{rupees(total)}</strong>
        </p>
        <FormError msg={state?.error} />
        <input type="hidden" name="cart" value={JSON.stringify(items.map((i) => ({ productId: i.productId, mode: i.mode, qty: i.qty })))} />
        <input type="hidden" name="sessionId" value={sessionId} />
        {coupon?.ok && savedCoupon ? <input type="hidden" name="couponCode" value={coupon.code} /> : null}

        <fieldset className="grid gap-4 sm:grid-cols-2" onBlur={rememberLead}>
          <legend className="mb-3 font-display text-xl font-bold">Contact</legend>
          <Field label="Full name" name="name" autoComplete="name" error={e.name} required />
          <Field
            label="Mobile number"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            error={e.phone}
            hint="10 digits. We'll call or WhatsApp this number about your order, including if checkout isn't finished."
            maxLength={14}
            required
          />
          <Field label="Email (optional)" name="email" type="email" autoComplete="email" error={e.email} className="sm:col-span-2" />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-display text-xl font-bold">Delivery address</legend>
          <Field label="House no., street, area" name="addressLine" autoComplete="street-address" error={e.addressLine} className="sm:col-span-2" required />
          <Field
            label="PIN code"
            name="pincode"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            error={e.pincode}
            hint={pinNote || "We fill in the state for you"}
            onChange={(ev) => onPin(ev.currentTarget.value)}
            required
          />
          <Field label="City" name="city" autoComplete="address-level2" error={e.city} required />
          <div className="sm:col-span-2">
            <label htmlFor="state" className="label">
              State
            </label>
            <select
              ref={stateRef}
              id="state"
              name="state"
              className="input"
              defaultValue=""
              required
              aria-invalid={!!e.state}
              aria-describedby={e.state ? "state-error" : undefined}
            >
              <option value="" disabled>
                Choose state
              </option>
              {STATES.map((st) => (
                <option key={st}>{st}</option>
              ))}
            </select>
            <FieldError msg={e.state} id="state-error" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className="label">
              Delivery notes (optional)
            </label>
            <textarea id="notes" name="notes" rows={2} className="input" />
          </div>
        </fieldset>

        {isCorporate ? (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-display text-xl font-bold">Company details</legend>
            <Field label="Company name" name="companyName" autoComplete="organization" error={e.companyName} required />
            <Field label="GSTIN (optional)" name="gstin" error={e.gstin} hint="For a GST invoice" />
          </fieldset>
        ) : (
          <details className="rounded-tile border border-paper-line bg-white p-4" open={!!(e.companyName || e.gstin)}>
            <summary className="cursor-pointer font-medium">Need a GST invoice? Add company details</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Company name" name="companyName" autoComplete="organization" error={e.companyName} />
              <Field label="GSTIN" name="gstin" error={e.gstin} hint="15 characters, e.g. 27ABCDE1234F1Z5" />
            </div>
          </details>
        )}

        {codOffered ? (
          <fieldset>
            <legend className="mb-3 font-display text-xl font-bold">Payment</legend>
            <div className="grid gap-2">
              <label className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-tile border bg-white px-4 py-3 ${payment === "UPI" ? "border-pista ring-2 ring-pista/20" : "border-paper-line"}`}>
                <input type="radio" name="paymentMethod" value="UPI" checked={payment === "UPI"} onChange={() => setPayment("UPI")} className="h-5 w-5" />
                <span>
                  <span className="block font-semibold">Pay now by UPI</span>
                  <span className="block text-sm text-ink-soft">GPay, PhonePe, Paytm or any UPI app. Dispatched sooner.</span>
                </span>
              </label>
              <label className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-tile border bg-white px-4 py-3 ${payment === "COD" ? "border-pista ring-2 ring-pista/20" : "border-paper-line"}`}>
                <input type="radio" name="paymentMethod" value="COD" checked={payment === "COD"} onChange={() => setPayment("COD")} className="h-5 w-5" />
                <span>
                  <span className="block font-semibold">Cash on delivery</span>
                  <span className="block text-sm text-ink-soft">Pay the courier in cash or UPI. {rupees(s.codFee)} extra.</span>
                </span>
              </label>
            </div>
          </fieldset>
        ) : (
          <input type="hidden" name="paymentMethod" value="UPI" />
        )}
      </div>

      <aside className="card h-fit p-6">
        <h2 className="text-xl font-bold">Order summary</h2>
        <ul className="mt-4 space-y-2 text-[15px]">
          {items.map((i) => (
            <li key={`${i.productId}-${i.mode}`} className="flex justify-between gap-3">
              <span>
                {i.name} <span className="text-ink-mute">× {i.qty}</span>
              </span>
              <span className="rate-num">{rupees(i.unitPrice * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-paper-line pt-4 text-[15px]">
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
          {cod ? (
            <div className="flex justify-between">
              <dt>Cash on delivery fee</dt>
              <dd className="rate-num">{rupees(s.codFee)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between pt-2 text-lg font-bold">
            <dt>Total</dt>
            <dd className="rate-num">{rupees(total)}</dd>
          </div>
        </dl>
        {coupon && !coupon.ok && savedCoupon ? <p className="mt-3 text-sm text-khata">{coupon.error}. It won&apos;t be applied.</p> : null}
        <Submit busy={busy} className="btn-primary mt-5 w-full !py-3" pending="Placing order…">
          {cod ? "Place order (cash on delivery)" : "Place order and pay by UPI"}
        </Submit>
        <p className="mt-3 text-sm text-ink-mute">{cod ? "Pay when your parcel arrives." : "Prices are confirmed on the next page before you pay."}</p>
      </aside>
    </form>
  );
}
