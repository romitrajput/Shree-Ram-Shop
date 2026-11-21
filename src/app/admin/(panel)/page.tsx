import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDashboard, type Kpi } from "@/lib/analytics-server";
import { getAttention } from "@/lib/attention";
import { rupees, pct } from "@/lib/format";
import { BarList, Funnel, HourBars, TrendChart } from "./charts";

const RANGES = [7, 30, 90];

export default async function AnalyticsDashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const days = RANGES.includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const [d, a] = await Promise.all([getDashboard(days), getAttention()]);
  const todo = [
    { n: a.toVerify, label: a.toVerify === 1 ? "payment to verify" : "payments to verify", href: "/admin/orders?f=verify" },
    { n: a.codToShip, label: a.codToShip === 1 ? "cash-on-delivery order to pack" : "cash-on-delivery orders to pack", href: "/admin/orders?f=todo" },
    { n: a.unfinishedCheckouts, label: a.unfinishedCheckouts === 1 ? "unfinished checkout to follow up" : "unfinished checkouts to follow up", href: "/admin/checkouts" },
    { n: a.pendingReviews, label: a.pendingReviews === 1 ? "review to approve" : "reviews to approve", href: "/admin/reviews" },
    { n: a.newEnquiries, label: a.newEnquiries === 1 ? "new corporate enquiry" : "new corporate enquiries", href: "/admin/enquiries" }
  ].filter((t) => t.n > 0);
  const noData = d.kpis.visitors.value === 0 && d.kpis.orders.value === 0;
  const rupeeFmt = (v: number) => rupees(Math.round(v));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <nav className="flex gap-1 rounded-full bg-white p-1" aria-label="Date range">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin?days=${r}`}
              aria-current={r === days}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${r === days ? "bg-pista text-white" : "text-ink-soft"}`}
            >
              <span className="hidden sm:inline">Last </span>
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      {/* What the owner should do first; the numbers below are for planning */}
      <section aria-labelledby="todo-h" className="card p-4 sm:p-5">
        <h2 id="todo-h" className="text-lg font-bold">
          Needs attention
        </h2>
        {todo.length === 0 ? (
          <p className="mt-1 text-[15px] text-ink-soft">All caught up. New payments, reviews and enquiries show up here.</p>
        ) : (
          <ul className="mt-2 divide-y divide-paper-line">
            {todo.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="flex min-h-[48px] items-center justify-between gap-3 py-2 text-[15px] hover:text-pista">
                  <span>
                    <strong className="rate-num">{t.n}</strong> {t.label}
                  </span>
                  <span aria-hidden>›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {noData ? (
        <p className="card p-6 text-ink-soft">
          No visits recorded yet in this period. Numbers appear here as soon as customers start browsing the shop. Visits from your own logged-in browser are
          not counted.
        </p>
      ) : null}

      {/* Headline numbers with change vs the previous period of the same length */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Visitors" kpi={d.kpis.visitors} />
        <Stat label="Page views" kpi={d.kpis.pageviews} />
        <Stat label="Orders" kpi={d.kpis.orders} />
        <Stat label="Revenue" kpi={d.kpis.revenue} format={rupeeFmt} />
        <Stat label="Visits that order" kpi={d.kpis.conversion} format={(v) => pct(v)} />
        <Stat label="Average order" kpi={d.kpis.aov} format={rupeeFmt} />
      </section>

      {d.insights.length ? (
        <section className="card p-6">
          <h2 className="text-xl font-bold">What to work on</h2>
          <p className="text-sm text-ink-soft">Suggestions worked out from the last {days} days of shop activity.</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {d.insights.map((i) => (
              <li key={i.title} className="rounded-lg bg-paper p-4">
                <span
                  className={`inline-block rounded-full px-2.5 text-xs font-semibold leading-6 ${
                    i.tone === "warning" ? "bg-khata-light text-khata" : i.tone === "good" ? "bg-pista-light text-pista-dark" : "bg-marigold-light text-[#6B4E00]"
                  }`}
                >
                  {i.tone === "warning" ? "Needs attention" : i.tone === "good" ? "Going well" : "Idea"}
                </span>
                <p className="mt-2 font-semibold">{i.title}</p>
                <p className="mt-1 text-[15px] text-ink-soft">{i.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Visitors per day">
          <TrendChart label="Visitors" points={d.daily.map((p) => ({ date: p.date, value: p.visitors }))} />
        </Panel>
        <Panel title="Revenue per day">
          <TrendChart label="Revenue" points={d.daily.map((p) => ({ date: p.date, value: p.revenue / 100 }))} kind="rupees" />
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Where visitors drop off" note="Visits in this period that reached each step">
          <Funnel steps={d.funnel} />
        </Panel>
        <Panel title="Where visitors come from" note="Visits, with the share that placed an order">
          <BarList rows={d.sources.slice(0, 8).map((s) => ({ label: s.source, value: s.sessions, note: `${pct(s.conversion)} order` }))} />
        </Panel>
      </section>

      <Panel title="Products" note="Sorted by revenue. Cart rate = share of people who viewed the product and added it to cart.">
        {d.products.length === 0 ? (
          <p className="text-sm text-ink-mute">No product activity yet for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="rate-num w-full min-w-[620px] text-left text-[15px]">
              <thead className="border-b border-paper-line text-sm text-ink-soft">
                <tr>
                  <th className="py-2 font-medium">Product</th>
                  <th className="py-2 text-right font-medium">Views</th>
                  <th className="py-2 text-right font-medium">Cart rate</th>
                  <th className="py-2 text-right font-medium">Packs sold</th>
                  <th className="py-2 text-right font-medium">Revenue</th>
                  <th className="py-2 text-right font-medium">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {d.products.slice(0, 15).map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">
                      <Link href={`/admin/products/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2 text-right">{p.views}</td>
                    <td className="py-2 text-right">{p.views ? pct(p.cartRate) : "—"}</td>
                    <td className="py-2 text-right">{p.units}</td>
                    <td className="py-2 text-right font-semibold">{rupees(p.revenue)}</td>
                    <td className={`py-2 text-right ${p.stock <= 10 ? "font-semibold text-khata" : ""}`}>{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel title="Busiest hours" note="India time">
          <HourBars hours={d.hours} />
        </Panel>
        <Panel title="Devices">
          <BarList rows={d.devices.map((s) => ({ label: capital(s.source), value: s.sessions, note: `${pct(s.conversion)} order` }))} />
        </Panel>
        <Panel title="Customers">
          <dl className="space-y-3 text-[15px]">
            <Row k="New visitors" v={d.newVsReturning.newSessions.toLocaleString("en-IN")} />
            <Row k="Returning visitors" v={d.newVsReturning.returningSessions.toLocaleString("en-IN")} />
            <Row k="Customers who ordered again (all time)" v={pct(d.repeatRate, 0)} />
            {d.mix.map((m) => (
              <Row key={m.type} k={`${m.type === "CORPORATE" ? "Corporate" : "Retail"} orders`} v={`${m.orders} · ${rupees(m.revenue)}`} />
            ))}
            <Row k="Corporate enquiries" v={`${Object.values(d.enquiryCounts).reduce((a, b) => a + b, 0)} (${d.enquiryCounts.WON ?? 0} won)`} />
          </dl>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="What people search for" note="Searches with 0 results show demand you are not meeting">
          {d.searches.length === 0 ? (
            <p className="text-sm text-ink-mute">No searches yet for this period.</p>
          ) : (
            <ul className="divide-y divide-paper-line text-[15px]">
              {d.searches.slice(0, 12).map((s) => (
                <li key={s.query} className="flex justify-between py-1.5">
                  <span>{s.query}</span>
                  <span className="rate-num text-ink-soft">
                    {s.searches}× {s.results === 0 ? <span className="ml-2 rounded bg-khata-light px-1.5 text-sm text-khata">0 results</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Most viewed pages">
          <BarList rows={d.pages.map((p) => ({ label: p.path, value: p.views }))} />
        </Panel>
      </section>
    </div>
  );
}

function Stat({ label, kpi, format = (v: number) => v.toLocaleString("en-IN") }: { label: string; kpi: Kpi; format?: (v: number) => string }) {
  const change = kpi.prev ? (kpi.value - kpi.prev) / kpi.prev : null;
  return (
    <div className="card p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="rate-num mt-1 font-display text-2xl font-bold">{format(kpi.value)}</p>
      <p className="rate-num mt-0.5 text-xs text-ink-mute">
        {change === null ? (
          "No earlier data"
        ) : (
          <>
            <span className={change >= 0 ? "text-pista" : "text-khata"}>
              {change >= 0 ? "▲" : "▼"} {Math.abs(change * 100).toFixed(0)}%
            </span>{" "}
            vs previous period
          </>
        )}
      </p>
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {note ? <p className="text-sm text-ink-mute">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-soft">{k}</dt>
      <dd className="rate-num font-semibold">{v}</dd>
    </div>
  );
}

function capital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
