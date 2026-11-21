"use client";

import { useActionState } from "react";
import { Field, FieldError, Submit, keepValues } from "@/components/Form";
import { addReview, type AdminFormState } from "../actions";

export function AddReviewForm({ products }: { products: { id: string; name: string }[] }) {
  const [state, action, busy] = useActionState<AdminFormState, FormData>(addReview, undefined);
  const e = state?.fieldErrors ?? {};
  return (
    <form onSubmit={keepValues(action)} className="card h-fit space-y-4 p-6">
      <h2 className="text-lg font-bold">Add a customer review</h2>
      <p className="text-sm text-ink-soft">For feedback you received on WhatsApp, by phone or in the shop. It is published straight away.</p>
      {state?.ok ? <p className="rounded-lg bg-pista-light px-3 py-2 text-sm text-pista-dark">Review published.</p> : null}
      <div>
        <label className="label" htmlFor="productId">
          Product
        </label>
        <select id="productId" name="productId" className="input" defaultValue="">
          <option value="" disabled>
            Choose a product
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <FieldError msg={e.productId} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Customer name" name="name" error={e.name} />
        <Field label="City" name="city" />
      </div>
      <div>
        <label className="label" htmlFor="rating">
          Rating
        </label>
        <select id="rating" name="rating" className="input" defaultValue="5">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>
      <Field label="Title (optional)" name="title" />
      <div>
        <label className="label" htmlFor="body">
          Review
        </label>
        <textarea id="body" name="body" rows={4} className="input" />
        <FieldError msg={e.body} />
      </div>
      <Submit busy={busy}>Publish review</Submit>
    </form>
  );
}
