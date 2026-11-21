import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog";
import { EnquiryForm } from "./EnquiryForm";
import { BulkOrderSheet } from "./BulkOrderSheet";

export const metadata: Metadata = {
  title: "Corporate & bulk dry fruits",
  description: "Bulk dry fruit supply for offices, hotels, sweet shops and Diwali gifting. Minimum order quantities, GST invoices and custom gift boxes."
};

export default async function CorporatePage() {
  const products = await listProducts({ corporate: true, sort: "popular" });

  return (
    <>
      <section className="bg-pista text-white">
        <div className="container-x py-14 md:py-20">
          <h1 className="max-w-3xl text-4xl font-extrabold text-white sm:text-5xl">Bulk dry fruits for offices, hotels and festive gifting</h1>
          <p className="mt-5 max-w-xl text-lg text-white/80">
            Buy at corporate rates once you reach the minimum order quantity (MOQ) for a product. Order straight from the table below, or send us your
            requirement for a custom quote.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#rates" className="btn-accent !px-7 !py-3">
              See bulk rates
            </a>
            <a href="#enquiry" className="btn !border !border-white/30 !px-7 !py-3 text-white hover:bg-white/10">
              Request a quote
            </a>
          </div>
        </div>
      </section>

      <section className="container-x mt-14">
        <h2 className="text-3xl font-bold">How corporate orders work</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            ["Pick products and quantities", "Order at least the MOQ shown for each product to unlock its bulk rate."],
            ["Pay by UPI or bank transfer", "Add your GSTIN at checkout for a tax invoice. Large orders can pay 50% upfront on quote."],
            ["We pack and dispatch", "Standard packs ship in 2–3 days. Custom gift boxes take 7–10 days."]
          ].map(([t, d], i) => (
            <li key={t} className="card p-6">
              <span className="font-display text-3xl font-extrabold text-marigold">{i + 1}</span>
              <p className="mt-2 font-display text-lg font-bold">{t}</p>
              <p className="mt-1 text-[15px] text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="rates" className="container-x mt-16 scroll-mt-24">
        <h2 className="text-3xl font-bold">Bulk rates</h2>
        <p className="mt-2 text-ink-soft">Choose packs for as many products as you need, then add them to the cart together.</p>
        {products.length === 0 ? (
          <p className="mt-4 text-ink-soft">Bulk rates are shared on request. Send us your requirement below.</p>
        ) : (
          <BulkOrderSheet
            rows={products
              .filter((p) => p.corporatePrice && p.moq)
              .map((p) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                unit: p.unit,
                image: p.images[0]?.url,
                retail: p.price,
                bulk: p.corporatePrice!,
                moq: p.moq!,
                stock: p.stock
              }))}
          />
        )}
        <p className="mt-3 text-sm text-ink-mute">Rates include GST. Need more than 1,000 packs? Ask for a quote for a better rate.</p>
      </section>

      <section id="enquiry" className="container-x mt-16 grid scroll-mt-24 gap-10 md:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="text-3xl font-bold">Request a quote</h2>
          <p className="mt-3 text-lg text-ink-soft">
            Tell us what you need and when. We reply within one working day with rates, packing options and a delivery date.
          </p>
          <ul className="mt-6 space-y-2 text-[15px]">
            <li>Diwali and festival gift boxes with your logo</li>
            <li>Monthly supply for office pantries and canteens</li>
            <li>Hotels, caterers and sweet shops</li>
            <li>Wedding and event return gifts</li>
          </ul>
        </div>
        <EnquiryForm />
      </section>
    </>
  );
}
