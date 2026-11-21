import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateEnquiry } from "../actions";

const STATUSES = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"] as const;
const LABEL: Record<string, string> = { NEW: "New", CONTACTED: "Contacted", QUOTED: "Quote sent", WON: "Won", LOST: "Lost" };

export default async function AdminEnquiries() {
  await requireAdmin();
  const enquiries = await db.corporateEnquiry.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 });
  const counts = STATUSES.map((s) => [s, enquiries.filter((e) => e.status === s).length] as const);
  const closed = enquiries.filter((e) => e.status === "WON" || e.status === "LOST").length;
  const won = enquiries.filter((e) => e.status === "WON").length;

  return (
    <div>
      <h1 className="text-3xl font-bold">Corporate enquiries</h1>
      <p className="mt-2 text-ink-soft">
        {counts.map(([s, n]) => `${LABEL[s]} ${n}`).join("  ·  ")}
        {closed ? `  ·  Win rate ${Math.round((won / closed) * 100)}%` : ""}
      </p>

      {enquiries.length === 0 ? (
        <p className="card mt-6 p-8 text-ink-soft">No enquiries yet. Quote requests from the Corporate page land here.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {enquiries.map((e) => (
            <li key={e.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display text-lg font-bold">{e.companyName}</p>
                <p className="text-sm text-ink-mute">
                  {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(e.createdAt)}
                </p>
              </div>
              <p className="text-[15px]">
                {e.contactName} ·{" "}
                <a className="text-pista underline" href={`tel:${e.phone}`}>
                  {e.phone}
                </a>
                {e.email ? ` · ${e.email}` : ""}
                {e.city ? ` · ${e.city}` : ""}
                {e.gstin ? ` · GSTIN ${e.gstin}` : ""}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {[e.occasion, e.quantity && `Qty: ${e.quantity}`, e.budget && `Budget: ${e.budget}`].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-2 whitespace-pre-line text-[15px]">{e.message}</p>
              <form action={updateEnquiry} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="id" value={e.id} />
                <select name="status" defaultValue={e.status} className="input sm:w-40">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LABEL[s]}
                    </option>
                  ))}
                </select>
                <input name="ownerNotes" defaultValue={e.ownerNotes ?? ""} placeholder="Your notes (quote amount, follow-up date…)" className="input flex-1" />
                <button className="btn-primary">Save</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
