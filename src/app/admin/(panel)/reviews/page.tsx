import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Stars } from "@/components/ProductBits";
import { moderateReview } from "../actions";
import { AddReviewForm } from "./AddReviewForm";

export default async function AdminReviews() {
  await requireAdmin();
  const [pending, recent, products] = await Promise.all([
    db.review.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { product: { select: { name: true } } } }),
    db.review.findMany({ where: { status: { not: "PENDING" } }, orderBy: { createdAt: "desc" }, take: 40, include: { product: { select: { name: true } } } }),
    db.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-3xl font-bold">Reviews</h1>
        <h2 className="mt-6 text-lg font-bold">Waiting for approval ({pending.length})</h2>
        {pending.length === 0 ? <p className="mt-2 text-ink-soft">All caught up. New customer reviews appear here before going live.</p> : null}
        <ul className="mt-3 space-y-3">
          {pending.map((r) => (
            <li key={r.id} className="card p-5">
              <ReviewBody r={r} />
              <div className="mt-3 flex gap-3">
                {["approve", "reject"].map((a) => (
                  <form key={a} action={moderateReview}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="action" value={a} />
                    <button className={a === "approve" ? "btn-primary !py-1.5" : "btn-ghost !py-1.5"}>{a === "approve" ? "Publish" : "Reject"}</button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-lg font-bold">Recent</h2>
        <ul className="mt-3 space-y-3">
          {recent.map((r) => (
            <li key={r.id} className="card p-5">
              <ReviewBody r={r} />
              <div className="mt-2 flex items-center gap-3 text-sm">
                <span className={r.status === "APPROVED" ? "text-pista" : "text-khata"}>{r.status === "APPROVED" ? "Published" : "Rejected"}</span>
                {r.source === "ADMIN" ? <span className="text-ink-mute">Added by you</span> : null}
                <form action={moderateReview} className="ml-auto">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="action" value="delete" />
                  <button className="text-khata underline">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <AddReviewForm products={products} />
    </div>
  );
}

function ReviewBody({ r }: { r: { rating: number; name: string; city: string | null; body: string; title: string | null; product: { name: string } } }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Stars value={r.rating} />
        <span className="text-sm text-ink-soft">
          {r.name}
          {r.city ? `, ${r.city}` : ""} on <strong>{r.product.name}</strong>
        </span>
      </div>
      {r.title ? <p className="mt-2 font-semibold">{r.title}</p> : null}
      <p className="mt-1 text-[15px]">{r.body}</p>
    </>
  );
}
