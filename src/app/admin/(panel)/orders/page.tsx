import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { rupees, ORDER_STATUS_LABEL } from "@/lib/format";

const FILTERS: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "verify", label: "Payment to verify", statuses: ["PAYMENT_SUBMITTED"] },
  { key: "unpaid", label: "Waiting for payment", statuses: ["PENDING_PAYMENT"] },
  { key: "todo", label: "To pack & ship", statuses: ["CONFIRMED", "PACKED"] },
  { key: "shipped", label: "Shipped", statuses: ["SHIPPED"] },
  { key: "done", label: "Delivered", statuses: ["DELIVERED"] },
  { key: "all", label: "All" }
];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.f) ?? FILTERS[0];
  const where: Prisma.OrderWhereInput = filter.statuses ? { status: { in: filter.statuses } } : {};
  if (sp.q) where.OR = [{ orderNumber: { contains: sp.q.toUpperCase() } }, { phone: { contains: sp.q } }, { name: { contains: sp.q, mode: "insensitive" } }];
  const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { _count: { select: { items: true } } } });

  return (
    <div>
      <h1 className="text-3xl font-bold">Orders</h1>
      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/orders?f=${f.key}`}
            className={`rounded-full border px-4 py-1.5 text-sm ${f.key === filter.key ? "border-pista bg-pista text-white" : "border-paper-line bg-white"}`}
          >
            {f.label}
          </Link>
        ))}
        <form className="ml-auto">
          <input type="hidden" name="f" value="all" />
          <input name="q" defaultValue={sp.q} placeholder="Order no., phone or name" className="input !py-1.5" />
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="card mt-6 p-8 text-ink-soft">No orders in “{filter.label}”.</p>
      ) : (
        <>
        {/* Phones: one tappable row per order with the two things the owner acts on, amount and status */}
        <ul className="mt-6 divide-y divide-paper-line rounded-tile border border-paper-line bg-white md:hidden">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex items-start justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block font-semibold text-pista">{o.orderNumber}</span>
                  <span className="block truncate text-sm text-ink-soft">
                    {o.name} · {o.city}
                    {o.customerType === "CORPORATE" ? " · Corporate" : ""}
                    {o.paymentMethod === "COD" ? " · Cash on delivery" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="rate-num block font-semibold">{rupees(o.total)}</span>
                  <span className={`block text-sm ${o.status === "PAYMENT_SUBMITTED" ? "font-semibold text-khata" : "text-ink-soft"}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 hidden overflow-x-auto rounded-tile border border-paper-line bg-white md:block">
          <table className="w-full min-w-[760px] text-left text-[15px]">
            <thead className="border-b border-paper-line text-sm text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">UTR</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="rate-num divide-y divide-paper-line">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-pista underline-offset-4 hover:underline">
                      {o.orderNumber}
                    </Link>
                    <span className="block text-sm text-ink-mute">
                      {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(o.createdAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {o.name}
                    {o.customerType === "CORPORATE" ? <span className="ml-2 rounded bg-marigold-light px-1.5 text-xs">Corporate</span> : null}
                    {o.paymentMethod === "COD" ? <span className="ml-2 rounded bg-pista-light px-1.5 text-xs text-pista-dark">COD</span> : null}
                    <span className="block text-sm text-ink-mute">
                      {o.city} · {o._count.items} items
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{rupees(o.total)}</td>
                  <td className="px-4 py-3 text-sm">{o.paymentMethod === "COD" ? "Cash on delivery" : (o.paymentRef ?? "—")}</td>
                  <td className="px-4 py-3 text-sm">{ORDER_STATUS_LABEL[o.status]}</td>
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
