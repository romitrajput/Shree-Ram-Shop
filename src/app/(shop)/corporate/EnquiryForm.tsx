"use client";

import { useActionState, useEffect } from "react";
import { submitEnquiry, type FormState } from "../actions";
import { keepValues, Field, FieldError, FormError, Submit } from "@/components/Form";
import { track } from "@/lib/analytics-client";

export function EnquiryForm() {
  const [state, action, busy] = useActionState<FormState, FormData>(submitEnquiry, undefined);
  const e = state?.fieldErrors ?? {};

  useEffect(() => {
    if (state?.ok) track("enquiry_submitted");
  }, [state?.ok]);

  if (state?.ok) {
    return (
      <div className="card p-8">
        <p className="font-display text-2xl font-bold">Enquiry received</p>
        <p className="mt-2 text-ink-soft">We&apos;ll call you within one working day with a quote.</p>
      </div>
    );
  }

  return (
    <form onSubmit={keepValues(action)} className="card grid gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError msg={state?.error} />
      </div>
      <Field label="Company name" name="companyName" autoComplete="organization" error={e.companyName} required />
      <Field label="Your name" name="contactName" autoComplete="name" error={e.contactName} required />
      <Field label="Mobile number" name="phone" type="tel" inputMode="tel" error={e.phone} required />
      <Field label="Email (optional)" name="email" type="email" error={e.email} />
      <Field label="City" name="city" />
      <Field label="GSTIN (optional)" name="gstin" />
      <div>
        <label htmlFor="occasion" className="label">
          Occasion
        </label>
        <select id="occasion" name="occasion" className="input" defaultValue="">
          <option value="">Choose one</option>
          <option>Diwali / festival gifting</option>
          <option>Office pantry supply</option>
          <option>Hotel / restaurant / caterer</option>
          <option>Sweet shop / bakery</option>
          <option>Wedding / event</option>
          <option>Other</option>
        </select>
      </div>
      <Field label="Approx. quantity" name="quantity" placeholder="e.g. 300 boxes of 500 g" />
      <Field label="Budget per box (optional)" name="budget" placeholder="e.g. ₹600" className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <label htmlFor="message" className="label">
          What do you need?
        </label>
        <textarea id="message" name="message" rows={4} className="input" placeholder="Products, mix, packing, delivery date and locations" />
        <FieldError msg={e.message} />
      </div>
      <div className="sm:col-span-2">
        <Submit busy={busy} pending="Sending…">Send enquiry</Submit>
      </div>
    </form>
  );
}
