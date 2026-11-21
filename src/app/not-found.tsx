import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24">
      <h1 className="text-4xl font-extrabold">Page not found</h1>
      <p className="mt-3 text-ink-soft">The link may be old, or the product is no longer sold. Today&apos;s rates are on the shop page.</p>
      <Link href="/products" className="btn-primary mt-6">
        Go to the shop
      </Link>
    </div>
  );
}
