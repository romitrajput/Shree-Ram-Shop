import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ProductForm } from "../ProductForm";

export default async function NewProduct() {
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <Link href="/admin/products" className="text-sm text-ink-soft underline">
        All products
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Add product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
