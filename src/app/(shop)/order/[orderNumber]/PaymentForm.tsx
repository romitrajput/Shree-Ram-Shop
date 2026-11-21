"use client";

import { useActionState } from "react";
import { submitPayment, type FormState } from "../../actions";
import { Field, FieldError, FormError, Submit } from "@/components/Form";

export function PaymentForm({ orderNumber, submittedRef }: { orderNumber: string; submittedRef: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(submitPayment, undefined);

  if (state?.ok) {
    return (
      <p role="status" className="mt-4 rounded-lg bg-pista-light p-4 text-[15px] text-pista-dark">
        Thanks. We&apos;ll match your payment with our bank statement and confirm the order, usually within 2 working hours.
      </p>
    );
  }

  return (
    <form action={action} className="mt-4 space-y-4">
      <FormError msg={state?.error} />
      {submittedRef ? (
        <p className="text-[15px] text-ink-soft">
          You sent transaction ID <strong>{submittedRef}</strong>. Submit again only if it was wrong.
        </p>
      ) : null}
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <Field
        label="UPI transaction ID (UTR)"
        name="paymentRef"
        error={state?.fieldErrors?.paymentRef}
        hint="12-digit number shown on the payment success screen"
        inputMode="numeric"
        required
      />
      <div>
        <label htmlFor="screenshot" className="label">
          Payment screenshot (optional)
        </label>
        <input id="screenshot" name="screenshot" type="file" accept="image/*" className="input-file" />
        <FieldError msg={state?.fieldErrors?.screenshot} />
      </div>
      <Submit pending="Sending…">I&apos;ve paid</Submit>
    </form>
  );
}
