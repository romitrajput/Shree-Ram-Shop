import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { rupees, ORDER_STATUS_LABEL } from "@/lib/format";
import { updateOrderStatus } from "../../actions";

const NEXT: Record<string, { status: string; label: string }[]> = {
  PENDING_PAYMENT: [{ status: "CONFIRMED", label: "Mark as paid" }],
  PAYMENT_SUBMITTED: [{ status: "CONFIRMED", label: "Payment received – confirm order" }],
  CONFIRMED: [{ status: "PACKED", label: "Mark packed" }],
  PACKED: [{ status: "SHIPPED", label: "Mark shipped" }],
  SHIPPED: [{ status: "DELIVERED", label: "Mark delivered" }]
};

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id: (await params).id }, include: { items: true } });
  if (!order) notFound();
  const actions = NEXT[order.status] ?? [];
  const canCancel = !["DELIVERED", "CANCELLED"].includes(order.status);
  const wa = `https://wa.me/91${order.phone}?text=${encodeURIComponent(`Namaste ${order.name}, your Shree Ram Trading order ${order.orderNumber} is ${ORDER_STATUS_LABEL[order.status].toLowerCase()}.`)}`;

  return (
    <div className="max-w-4xl">
      <Link href="/admin/orders" className="text-sm text-ink-soft underline">
        All orders
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
        <p className="rounded-full bg-white px-3 py-1 text-sm font-semibold">{ORDER_STATUS_LABEL[order.status]}</p>
      </div>

      {order.paymentMethod === "COD" ? (
        <p className="mt-6 rounded-tile border-2 border-pista/40 bg-pista-light p-4 font-semibold text-pista-dark">
          Cash on delivery: the courier collects <span className="rate-num">{rupees(order.total)}</span> on delivery.
        </p>
      ) : null}

      {order.status === "PAYMENT_SUBMITTED" ? (
        <div className="mt-6 rounded-tile border-2 border-marigold bg-marigold-light p-5">
          <p className="font-semibold">Check your bank or UPI app for this payment before confirming:</p>
          <dl className="rate-num mt-2 grid gap-x-6 gap-y-1 text-[15px] sm:grid-cols-[auto_1fr]">
            <dt className="text-ink-soft">Amount</dt>
            <dd className="font-bold">{rupees(order.total)}</dd>
            <dt className="text-ink-soft">UTR / transaction ID</dt>
            <dd className="font-bold">{order.paymentRef}</dd>
            <dt className="text-ink-soft">Note on payment</dt>
            <dd>Order {order.orderNumber}</dd>
          </dl>
          {order.paymentScreenshot ? (
            <a href={order.paymentScreenshot} target="_blank" rel="noreferrer" className="mt-3 inline-block text-pista underline">
              Open payment screenshot
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {actions.map((a) => (
          <form key={a.status} action={updateOrderStatus}>
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value={a.status} />
            <button className="btn-primary">{a.label}</button>
          </form>
        ))}
        <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost">
          WhatsApp customer
        </a>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-bold">Items</h2>
          <ul className="rate-num mt-3 space-y-2 text-[15px]">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>
                  {i.name} ({i.unit}) × {i.qty}
                  {i.priceType === "CORPORATE" ? <span className="ml-1 text-xs text-ink-mute">bulk @ {rupees(i.unitPrice)}</span> : null}
                </span>
                <span>{rupees(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="rate-num mt-4 space-y-1 border-t border-paper-line pt-3 text-[15px]">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{rupees(order.subtotal)}</dd>
            </div>
            {order.discount ? (
              <div className="flex justify-between text-pista">
                <dt>Coupon {order.couponCode}</dt>
                <dd>−{rupees(order.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>{rupees(order.shipping)}</dd>
            </div>
            {order.codFee ? (
              <div className="flex justify-between">
                <dt>Cash on delivery fee</dt>
                <dd>{rupees(order.codFee)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd>{rupees(order.total)}</dd>
            </div>
          </dl>
        </section>
        <section className="card space-y-1 p-6 text-[15px]">
          <h2 className="mb-2 text-lg font-bold">Customer</h2>
          <p className="font-semibold">{order.name}</p>
          <p>
            <a href={`tel:${order.phone}`} className="text-pista underline">
              {order.phone}
            </a>
            {order.email ? ` · ${order.email}` : ""}
          </p>
          {order.companyName ? (
            <p>
              {order.companyName}
              {order.gstin ? ` · GSTIN ${order.gstin}` : ""}
            </p>
          ) : null}
          <p className="pt-2 text-ink-soft">
            {order.addressLine}, {order.city}, {order.state} {order.pincode}
          </p>
          {order.notes ? <p className="pt-2">Note: {order.notes}</p> : null}
        </section>
      </div>
      {canCancel ? (
        /* Kept away from the everyday buttons and behind a confirmation */
        <details className="mt-10 rounded-tile border border-paper-line bg-white p-4">
          <summary className="cursor-pointer font-medium text-ink-soft">More actions</summary>
          <form action={updateOrderStatus} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value="CANCELLED" />
            <label className="flex items-start gap-2 text-[15px]">
              <input type="checkbox" name="confirm" required className="mt-1 h-5 w-5" />
              <span>Yes, cancel order {order.orderNumber} and put the stock back. Refund the customer from your UPI app if they paid.</span>
            </label>
            <button className="btn-danger">Cancel order</button>
          </form>
        </details>
      ) : null}
    </div>
  );
}
