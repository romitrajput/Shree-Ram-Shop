"use client";

import { useActionState, useMemo, useState } from "react";
import type { Category, Product, ProductImage } from "@prisma/client";
import { keepValues, Field, FieldError, FormError, Submit } from "@/components/Form";
import { priceAfterDiscount, rupees, toPaise } from "@/lib/format";
import { saveProduct, type AdminFormState } from "../actions";

type Props = { categories: Category[]; product?: Product & { images: ProductImage[] } };

export function ProductForm({ categories, product: p }: Props) {
  const [state, action, busy] = useActionState<AdminFormState, FormData>(saveProduct, undefined);
  const e = state?.fieldErrors ?? {};
  const [mrp, setMrp] = useState(p ? String(p.mrp / 100) : "");
  const [discount, setDiscount] = useState(p ? String(p.discountPct) : "0");
  const [corporate, setCorporate] = useState(p?.corporateEnabled ?? false);
  const [previews, setPreviews] = useState<string[]>([]);
  const selling = useMemo(() => priceAfterDiscount(toPaise(mrp), Number(discount) || 0), [mrp, discount]);

  return (
    <form onSubmit={keepValues(action)} className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <FormError msg={state?.error} />
        {state?.ok ? <p className="rounded-lg bg-pista-light px-4 py-2 text-pista-dark">Saved. The shop now shows these changes.</p> : null}
        {p ? <input type="hidden" name="id" value={p.id} /> : null}

        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="text-lg font-bold sm:col-span-2">Product details</h2>
          <Field label="Name" name="name" defaultValue={p?.name} error={e.name} className="sm:col-span-2" placeholder="California Almonds (Badam)" required />
          <Field label="Pack size" name="unit" defaultValue={p?.unit ?? "500 g"} error={e.unit} required />
          <Field label="Origin (optional)" name="origin" defaultValue={p?.origin ?? ""} placeholder="California, Kashmir, Iran…" />
          <div>
            <label className="label" htmlFor="categoryId">
              Category
            </label>
            <select id="categoryId" name="categoryId" defaultValue={p?.categoryId ?? ""} className="input">
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Field label="Or create a new category" name="newCategory" placeholder="e.g. Seeds" />
          <Field
            label="Short description"
            name="shortDescription"
            defaultValue={p?.shortDescription ?? ""}
            className="sm:col-span-2"
            hint="One line shown near the price"
          />
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">
              Full description
            </label>
            <textarea id="description" name="description" rows={6} defaultValue={p?.description} className="input" placeholder="Taste, size grade, storage, uses…" />
          </div>
          <Field label="Search keywords" name="tags" defaultValue={p?.tags.join(", ")} hint="Comma separated, e.g. badam, almond, gift" className="sm:col-span-2" />
          <Field label="URL (optional)" name="slug" defaultValue={p?.slug} error={e.slug} hint="Made from the name if left blank" className="sm:col-span-2" />
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-bold">Photos</h2>
          {p && p.images.length > 0 ? (
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {p.images.map((img, i) => (
                <li key={img.id} className="rounded-lg border border-paper-line p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt} className="aspect-square w-full rounded object-cover" />
                  <input name={`alt_${img.id}`} defaultValue={img.alt} className="input mt-2 !py-1 text-sm" aria-label="Photo description" placeholder="Describe the photo" />
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="radio" name="coverImage" value={img.id} defaultChecked={i === 0} /> Main photo
                  </label>
                  <label className="flex items-center gap-2 text-sm text-khata">
                    <input type="checkbox" name="removeImage" value={img.id} /> Remove
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
          <label className="mt-4 block rounded-lg border-2 border-dashed border-paper-line p-6 text-center hover:border-pista">
            <span className="font-medium text-pista">Upload photos</span>
            <span className="block text-sm text-ink-mute">JPG, PNG or WebP, up to 5 MB each. Square photos look best.</span>
            <input
              type="file"
              name="images"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="sr-only"
              onChange={(ev) => setPreviews(Array.from(ev.target.files ?? []).map((f) => URL.createObjectURL(f)))}
            />
          </label>
          {previews.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {previews.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="New photo preview" className="h-20 w-20 rounded object-cover" />
              ))}
            </div>
          ) : null}
          <FieldError msg={e.images} />
        </section>
      </div>

      <div className="space-y-6">
        <section className="card space-y-4 p-6">
          <h2 className="text-lg font-bold">Price & stock</h2>
          <Field label="MRP (₹)" name="mrp" inputMode="decimal" value={mrp} onChange={(ev) => setMrp(ev.target.value)} error={e.mrp} required />
          <Field
            label="Discount (%)"
            name="discountPct"
            type="number"
            min={0}
            max={90}
            value={discount}
            onChange={(ev) => setDiscount(ev.target.value)}
            error={e.discountPct}
          />
          <p className="rounded-lg bg-paper px-3 py-2">
            Customers pay <strong className="rate-num">{rupees(selling)}</strong>
            {Number(discount) > 0 ? <span className="text-ink-soft"> (save {rupees(toPaise(mrp) - selling)})</span> : null}
          </p>
          <Field label="Packs in stock" name="stock" type="number" min={0} defaultValue={p?.stock ?? 0} error={e.stock} required />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isActive" defaultChecked={p?.isActive ?? true} /> Show in shop
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isFeatured" defaultChecked={p?.isFeatured ?? false} /> Feature on home page
          </label>
        </section>

        <section className="card space-y-4 p-6">
          <label className="flex items-center gap-2 font-bold">
            <input type="checkbox" name="corporateEnabled" checked={corporate} onChange={(ev) => setCorporate(ev.target.checked)} /> Sell to corporate
            customers in bulk
          </label>
          {corporate ? (
            <>
              <Field label="Minimum order quantity (packs)" name="moq" type="number" min={1} defaultValue={p?.moq ?? 50} error={e.moq} />
              <Field
                label="Corporate price per pack (₹)"
                name="corporatePrice"
                inputMode="decimal"
                defaultValue={p?.corporatePrice ? String(p.corporatePrice / 100) : ""}
                error={e.corporatePrice}
                hint={`Retail price is ${rupees(selling)}`}
              />
            </>
          ) : null}
        </section>

        <Submit busy={busy} className="btn-primary w-full !py-3">{p ? "Save changes" : "Add product"}</Submit>
      </div>
    </form>
  );
}
