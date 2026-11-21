"use client";

import { useActionState, useState } from "react";
import { Field, FieldError, Submit, keepValues } from "@/components/Form";
import { createCoupon, type AdminFormState } from "../actions";

export function CouponForm() {
  const [state, action, busy] = useActionState<AdminFormState, FormData>(createCoupon, undefined);
  const [kind, setKind] = useState<"PERCENT" | "FLAT">("PERCENT");
  const e = state?.fieldErrors ?? {};
  return (
    <form onSubmit={keepValues(action)} className="card h-fit space-y-4 p-6">
      <h2 className="text-lg font-bold">New coupon</h2>
      {state?.ok ? <p className="rounded-lg bg-pista-light px-3 py-2 text-sm text-pista-dark">Coupon created. Share the code in your campaign.</p> : null}
      <Field label="Code" name="code" placeholder="DIWALI10" error={e.code} autoCapitalize="characters" className="[&_input]:uppercase" />
      <fieldset>
        <legend className="label">Discount type</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["PERCENT", "FLAT"] as const).map((k) => (
            <label key={k} className={`flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full border text-sm font-semibold ${kind === k ? "border-pista bg-pista text-white" : "border-paper-line"}`}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {k === "PERCENT" ? "% off" : "₹ off"}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={kind === "PERCENT" ? "Percent off" : "Rupees off"} name="value" inputMode="decimal" error={e.value} />
      {kind === "PERCENT" ? <Field label="Maximum discount (₹, optional)" name="maxDiscount" inputMode="decimal" /> : null}
      <Field label="Minimum order (₹, optional)" name="minOrder" inputMode="decimal" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Last day (optional)" name="expiresAt" type="date" />
        <Field label="Max uses (optional)" name="usageLimit" type="number" min={1} error={e.usageLimit} />
      </div>
      <label className="flex items-center gap-2 text-[15px]">
        <input type="checkbox" name="forCorporate" className="h-5 w-5" /> Also valid on bulk (corporate) orders
      </label>
      <FieldError msg={e.kind} />
      <Submit busy={busy}>Create coupon</Submit>
    </form>
  );
}
