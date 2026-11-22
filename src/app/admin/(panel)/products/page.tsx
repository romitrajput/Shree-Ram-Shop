import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { rupees } from "@/lib/format";
import { ProductImage } from "@/components/ProductBits";
import { quickUpdateProduct } from "../actions";
import { StockCard } from "./StockCard";
import { DeleteProduct } from "./DeleteProduct";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const q = (await searchParams).q;
  const products = await db.product.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true }
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">
          Add product
        </Link>
      </div>
      <form className="mt-5">
        <input name="q" defaultValue={q} placeholder="Search products" className="input max-w-xs" />
      </form>

      {products.length === 0 ? (
        <div className="card mt-6 p-8">
          <p className="font-medium">No products yet.</p>
          <p className="mt-1 text-ink-soft">Add your first product with photos, price, discount and stock. It appears in the shop as soon as you save.</p>
        </div>
      ) : (
        <>
        {/* Phones: stock and discount without sideways scrolling, saved automatically */}
        <ul className="mt-6 divide-y divide-paper-line rounded-tile border border-paper-line bg-white md:hidden">
          {products.map((p) => (
            <StockCard
              key={p.id}
              p={{ id: p.id, name: p.name, unit: p.unit, image: p.images[0]?.url, stock: p.stock, discountPct: p.discountPct, price: rupees(p.price), isActive: p.isActive }}
            />
          ))}
        </ul>
        <div className="mt-6 hidden overflow-x-auto rounded-tile border border-paper-line bg-white md:block">
          <table className="w-full min-w-[820px] text-left text-[15px]">
            <thead className="border-b border-paper-line text-sm text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">MRP</th>
                <th className="px-4 py-3 text-right font-medium">Selling price</th>
                <th className="px-4 py-3 font-medium">Discount % · Stock</th>
                <th className="px-4 py-3 font-medium">Bulk</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">Delete</span></th>
              </tr>
            </thead>
            <tbody className="rate-num divide-y divide-paper-line">
              {products.map((p) => (
                <tr key={p.id} className={p.isActive ? "" : "opacity-50"}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-paper-line">
                        <ProductImage src={p.images[0]?.url} alt={p.name} />
                      </span>
                      <span>
                        <span className="font-semibold text-ink hover:text-pista">{p.name}</span>
                        <span className="block text-sm text-ink-mute">
                          {p.unit}
                          {p.category ? ` · ${p.category.name}` : ""}
                          {!p.isActive ? " · Hidden" : ""}
                          {p.isFeatured ? " · Featured" : ""}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-ink-soft">{rupees(p.mrp)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{rupees(p.price)}</td>
                  <td className="px-4 py-3">
                    {/* Quick edit for the two things that change most often. */}
                    <form action={quickUpdateProduct} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="discountPct" type="number" min={0} max={90} defaultValue={p.discountPct} aria-label="Discount %" className="input !w-16 !py-1" />
                      <input
                        name="stock"
                        type="number"
                        min={0}
                        defaultValue={p.stock}
                        aria-label="Stock"
                        className={`input !w-20 !py-1 ${p.stock <= 10 ? "!border-khata" : ""}`}
                      />
                      <button className="text-sm font-semibold text-pista underline">Save</button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-sm">{p.corporateEnabled ? `${rupees(p.corporatePrice ?? 0)} · MOQ ${p.moq}` : "—"}</td>
                  <td className="px-4 py-3 text-sm">{p.ratingCount ? `${p.ratingAvg.toFixed(1)} (${p.ratingCount})` : "—"}</td>
                  <td className="px-4 py-3">
                    <DeleteProduct id={p.id} name={p.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
