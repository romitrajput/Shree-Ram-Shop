"use client";

import { useActionState } from "react";
import { findOrder, type FormState } from "../actions";
import { Field, FormError, Submit } from "@/components/Form";

export default function TrackPage() {
  const [state, action] = useActionState<FormState, FormData>(findOrder, undefined);
  return (
    <div className="container-x max-w-lg py-14">
      <h1 className="text-4xl font-extrabold">Track your order</h1>
      <p className="mt-2 text-ink-soft">Your order number starts with SRT and is in the confirmation on your screen or WhatsApp.</p>
      <form action={action} className="mt-8 space-y-4">
        <FormError msg={state?.error} />
        <Field label="Order number" name="orderNumber" placeholder="SRT2611151234" required />
        <Field label="Mobile number used for the order" name="phone" type="tel" inputMode="tel" required />
        <Submit pending="Looking up…">Find my order</Submit>
      </form>
    </div>
  );
}
