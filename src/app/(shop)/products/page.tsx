import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { listProducts, type ProductSort } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductBits";
import { TrackOnMount } from "@/components/PageTracker";
import { SortSelect } from "./SortSelect";

export const metadata: Metadata = { title: "Shop dry fruits" };

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
  { value: "new", label: "Newest" }
];

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = sp.q?.slice(0, 100);
  const sort = (SORTS.find((s) => s.value === sp.sort)?.value ?? "popular") as ProductSort;
  const [products, categories] = await Promise.all([
    listProducts({ q, category: sp.category, sort }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } })
  ]);

  return (
    <div className="container-x py-10">
      {q ? <TrackOnMount type="search" query={q} resultCount={products.length} /> : null}
      <h1 className="text-4xl font-extrabold">{q ? `Results for “${q}”` : "All dry fruits"}</h1>
      <p className="mt-2 text-ink-soft">
        {products.length} {products.length === 1 ? "product" : "products"}
      </p>

      <form className="mt-6 flex flex-col gap-3 sm:flex-row" action="/products">
        <input id="search" type="search" name="q" defaultValue={q} placeholder="Search almonds, kaju, anjeer…" className="input sm:max-w-sm" aria-label="Search products" />
        <SortSelect value={sort} options={SORTS} />
        {sp.category ? <input type="hidden" name="category" value={sp.category} /> : null}
        <button className="btn-primary">Search</button>
      </form>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/products" className={`rounded-full border px-4 py-1.5 text-sm ${!sp.category ? "border-pista bg-pista text-white" : "border-paper-line bg-white"}`}>
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/products?category=${c.slug}`}
            className={`rounded-full border px-4 py-1.5 text-sm ${sp.category === c.slug ? "border-pista bg-pista text-white" : "border-paper-line bg-white"}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="mt-16 max-w-md">
          <p className="text-lg font-medium">No products match that search.</p>
          <p className="mt-2 text-ink-soft">
            Try a shorter word like “kaju” or “badam”, or{" "}
            <Link href="/corporate#enquiry" className="text-pista underline">
              ask us to source it
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
