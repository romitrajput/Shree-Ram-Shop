import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { rupees } from "@/lib/format";
import { markLeadContacted } from "../actions";

type Line = { name: string; unit: string; qty: number; mode: "RETAIL" | "CORPORATE" };

function ago(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

/** People who typed their number at checkout but didn't place the order. */
export default async function AdminCheckouts() {
  await requireAdmin();
  const leads = await db.checkoutLead.findMany({
    where: { orderId: null, createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold">Unfinished checkouts</h1>
      <p className="mt-2 text-ink-soft">
        Shoppers who entered their mobile number at checkout in the last 7 days but didn&apos;t place the order. A friendly WhatsApp message often
        brings them back. Give them a couple of hours first.
      </p>
      {leads.length === 0 ? (
        <p className="card mt-6 p-6 text-ink-soft">No unfinished checkouts. They appear here when someone types their number at checkout and leaves.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {leads.map((l) => {
            const cart = (Array.isArray(l.cart) ? l.cart : []) as unknown as Line[];
            const list = cart.map((c) => `${c.name} (${c.unit}) × ${c.qty}`).join(", ");
            const msg = `Namaste${l.name ? ` ${l.name.split(" ")[0]}` : ""}, this is Shree Ram Trading Company. You were ordering ${list}. Can we help you complete the order? Reply here and we'll take it from there.`;
            return (
              <li key={l.id} className={`card p-4 ${l.contactedAt ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    {l.name || "No name"} · <a href={`tel:${l.phone}`} className="text-pista underline">{l.phone}</a>
                  </p>
                  <p className="rate-num text-sm text-ink-soft">
                    {rupees(l.subtotal)} · {ago(l.createdAt)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{list}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`https://wa.me/91${l.phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="btn-primary min-h-[44px] !py-2 text-sm">
                    Message on WhatsApp
                  </a>
                  {l.contactedAt ? (
                    <span className="self-center text-sm text-ink-soft">Contacted {ago(l.contactedAt)}</span>
                  ) : (
                    <form action={markLeadContacted}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="btn-ghost min-h-[44px] !py-2 text-sm">Mark as contacted</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
