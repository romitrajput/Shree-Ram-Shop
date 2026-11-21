"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitReview, type FormState } from "../../actions";
import { keepValues, Field, FieldError, FormError, Submit } from "@/components/Form";

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action, busy] = useActionState<FormState, FormData>(submitReview, undefined);
  const [rating, setRating] = useState(0);
  const [open, setOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  if (state?.ok) {
    return (
      <div className="card h-fit p-6">
        <p className="font-display text-xl font-bold">Thanks for your review</p>
        <p className="mt-2 text-ink-soft">It will appear here once we&apos;ve checked it, usually within a day.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="card h-fit p-6">
        <p className="font-display text-lg font-bold">Bought this before?</p>
        <p className="mt-1 text-[15px] text-ink-soft">Your review helps other buyers choose.</p>
        <button type="button" className="btn-ghost mt-4" aria-expanded="false" onClick={() => setOpen(true)}>
          Write a review
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={keepValues(action)} className="card h-fit space-y-4 p-6">
      <h3 className="text-xl font-bold" tabIndex={-1} ref={headingRef}>
        Write a review
      </h3>
      <FormError msg={state?.error} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating || ""} />
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              type="button"
              key={i}
              onClick={() => setRating(i)}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
              aria-pressed={rating === i}
              className="p-0.5"
            >
              <svg width="28" height="28" viewBox="0 0 20 20" aria-hidden>
                <path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8z" fill={rating >= i ? "#F2A900" : "#E6E1D6"} />
              </svg>
            </button>
          ))}
        </div>
        <FieldError msg={state?.fieldErrors?.rating} />
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" name="name" error={state?.fieldErrors?.name} required />
        <Field label="City (optional)" name="city" />
      </div>
      <div>
        <label htmlFor="body" className="label">
          Your review
        </label>
        <textarea id="body" name="body" rows={4} className="input" placeholder="How was the taste, freshness and packing?" />
        <FieldError msg={state?.fieldErrors?.body} />
      </div>
      <Submit busy={busy} pending="Sending…">Post review</Submit>
    </form>
  );
}
