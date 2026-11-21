import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ProductForm } from "../ProductForm";
import { deleteProduct } from "../../actions";

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } })
  ]);
  if (!product) notFound();
  const saved = (await searchParams).saved;

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-ink-soft underline">
        All products
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <Link href={`/products/${product.slug}`} target="_blank" className="text-sm text-pista underline">
          View in shop
        </Link>
      </div>
      {saved ? <p className="mt-3 rounded-lg bg-pista-light px-4 py-2 text-pista-dark">Product created. It&apos;s now live in the shop.</p> : null}
      <ProductForm categories={categories} product={product} />
      <form action={deleteProduct} className="mt-10 border-t border-paper-line pt-6">
        <input type="hidden" name="id" value={product.id} />
        <p className="text-sm text-ink-soft">Products with past orders are hidden from the shop instead of deleted, so order history stays complete.</p>
        <button className="btn-danger mt-3">Delete product</button>
      </form>
    </div>
  );
}
