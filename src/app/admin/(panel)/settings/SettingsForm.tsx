"use client";

import { useActionState } from "react";
import type { ShopSettings } from "@/lib/settings";
import { Field, FieldError, FormError, Submit, keepValues } from "@/components/Form";
import { updateSettings, type AdminFormState } from "../actions";

export function SettingsForm({ settings: s }: { settings: ShopSettings }) {
  const [state, action, busy] = useActionState<AdminFormState, FormData>(updateSettings, undefined);
  const e = state?.fieldErrors ?? {};
  return (
    <form onSubmit={keepValues(action)} className="mt-6 space-y-6">
      <FormError msg={state?.error} />
      {state?.ok ? <p className="rounded-lg bg-pista-light px-4 py-2 text-pista-dark">Settings saved.</p> : null}

      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">UPI payments</h2>
        <Field label="UPI ID" name="upiId" defaultValue={s.upiId} error={e.upiId} hint="Money from the QR code goes here" placeholder="shreeram@okhdfcbank" />
        <Field label="Name on the account" name="payeeName" defaultValue={s.payeeName} error={e.payeeName} />
        <div className="sm:col-span-2">
          <p className="text-sm text-ink-soft">
            With a UPI ID set, each order gets its own QR code with the exact amount filled in. You can also upload the QR from your bank app as a
            backup.
          </p>
          {s.qrImageUrl ? (
            <div className="mt-3 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.qrImageUrl} alt="Current QR code" className="h-24 w-24 rounded border border-paper-line" />
              <label className="flex items-center gap-2 text-sm text-khata">
                <input type="checkbox" name="removeQr" /> Remove
              </label>
            </div>
          ) : null}
          <label className="label mt-3" htmlFor="qrImage">
            Upload QR image
          </label>
          <input id="qrImage" type="file" name="qrImage" accept="image/png,image/jpeg,image/webp" className="input-file" />
          <FieldError msg={e.qrImage} />
        </div>
      </section>

      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">Delivery charges</h2>
        <Field label="Delivery fee (₹)" name="shippingFee" defaultValue={String(s.shippingFee / 100)} inputMode="decimal" />
        <Field label="Free delivery above (₹)" name="freeShippingAbove" defaultValue={String(s.freeShippingAbove / 100)} inputMode="decimal" />
      </section>

      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">Delivery times</h2>
        <p className="text-sm text-ink-soft sm:col-span-2">Shown when customers check their PIN code on a product page and at checkout.</p>
        <Field
          label="Nearby PIN codes start with"
          name="localPinPrefixes"
          defaultValue={s.localPinPrefixes}
          error={e.localPinPrefixes}
          hint="Comma separated, e.g. 411, 412"
          className="sm:col-span-2"
        />
        <Field label="Days for nearby PINs" name="localDays" defaultValue={s.localDays} error={e.localDays} hint="e.g. 1–2" />
        <Field label="Days for the rest of India" name="otherDays" defaultValue={s.otherDays} error={e.otherDays} hint="e.g. 3–6" />
      </section>

      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">Cash on delivery</h2>
        <label className="flex items-center gap-2 font-medium sm:col-span-2">
          <input type="checkbox" name="codEnabled" defaultChecked={s.codEnabled} className="h-5 w-5" /> Offer cash on delivery
        </label>
        <Field label="Only for orders up to (₹)" name="codLimit" defaultValue={String(s.codLimit / 100)} inputMode="decimal" hint="Bulk (corporate) orders are always prepaid" />
        <Field label="COD fee (₹)" name="codFee" defaultValue={String(s.codFee / 100)} inputMode="decimal" hint="Added to the order to cover the courier's charge" />
      </section>

      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">Contact details</h2>
        <Field label="WhatsApp number" name="whatsappNumber" defaultValue={s.whatsappNumber.replace(/^91/, "")} error={e.whatsappNumber} />
        <Field label="Phone" name="phone" defaultValue={s.phone} />
        <Field label="Email" name="email" type="email" defaultValue={s.email} error={e.email} />
        <Field label="GSTIN" name="gstin" defaultValue={s.gstin} />
        <Field label="Shop address" name="address" defaultValue={s.address} className="sm:col-span-2" />
      </section>

      <Submit busy={busy}>Save settings</Submit>
    </form>
  );
}
