import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { upiLink, upiQrDataUrl } from "@/lib/upi";
import { rupees, ORDER_STATUS_LABEL } from "@/lib/format";
import { PaymentForm } from "./PaymentForm";
import { OrderPlaced } from "./OrderPlaced";
import { PayOptions } from "./PayOptions";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

const STEPS = ["PENDING_PAYMENT", "PAYMENT_SUBMITTED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];

type Props = { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ p?: string; placed?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const order = await db.order.findUnique({ where: { orderNumber }, include: { items: true } });
  // The last 4 digits of the phone number act as a light check so order details aren't public.
  if (!order || !sp.p || order.phone.slice(-4) !== sp.p) notFound();

  const settings = await getSettings();
  const link = settings.upiId
    ? upiLink({ upiId: settings.upiId, payeeName: settings.payeeName, amountPaise: order.total, note: `Order ${order.orderNumber}` })
    : null;
  const qr = link ? await upiQrDataUrl(link) : null;
  const isCod = order.paymentMethod === "COD";
  // Cash-on-delivery orders skip the "payment to verify" step
  const steps = isCod ? STEPS.filter((x) => x !== "PAYMENT_SUBMITTED") : STEPS;
  const stepIndex = steps.indexOf(order.status);
  const waText = encodeURIComponent(`Hi, I have paid for order ${order.orderNumber} (${rupees(order.total)}). Sharing the payment screenshot.`);

  return (
    <div className="container-x py-10">
      {sp.placed ? <OrderPlaced orderNumber={order.orderNumber} total={order.total} /> : null}

      <p className="text-ink-soft">Order {order.orderNumber}</p>
      <h1 className="mt-1 text-4xl font-extrabold">
        {isCod && order.status === "CONFIRMED"
          ? "Order confirmed"
          : order.status === "PENDING_PAYMENT"
          ? `Pay ${rupees(order.total)} to confirm your order`
          : order.status === "PAYMENT_SUBMITTED"
            ? "We're checking your payment"
            : ORDER_STATUS_LABEL[order.status]}
      </h1>

      {order.status !== "CANCELLED" ? (
        <ol className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Order progress">
          {steps.slice(1).map((s, i) => (
            <li key={s} className={`flex items-center gap-2 ${i + 1 <= stepIndex ? "font-semibold text-pista" : "text-ink-mute"}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${i + 1 <= stepIndex ? "bg-pista" : "bg-paper-line"}`} aria-hidden />
              {ORDER_STATUS_LABEL[s]}
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          {order.status === "PAYMENT_SUBMITTED" ? (
            <section className="card p-6 text-[15px]">
              <p className="font-semibold">
                We received your transaction ID <span className="rate-num">{order.paymentRef}</span>.
              </p>
              <p className="mt-1 text-ink-soft">
                We match it with our bank statement and confirm the order, usually within 2 working hours. You don&apos;t need to do anything else.
              </p>
              <details className="mt-4 border-t border-paper-line pt-4">
                <summary className="cursor-pointer font-medium text-pista">Entered the wrong ID, or haven&apos;t paid yet?</summary>
                <div className="mt-4">
                  <PayOptions link={link} qr={qr ?? (settings.qrImageUrl || null)} upiId={settings.upiId} payee={settings.payeeName} amount={rupees(order.total)} />
                  <PaymentForm orderNumber={order.orderNumber} submittedRef={order.paymentRef} />
                </div>
              </details>
            </section>
          ) : order.status === "PENDING_PAYMENT" ? (
            <section className="card p-6">
              <h2 className="text-2xl font-bold">1. Pay {rupees(order.total)} by UPI</h2>
              <PayOptions link={link} qr={qr ?? (settings.qrImageUrl || null)} upiId={settings.upiId} payee={settings.payeeName} amount={rupees(order.total)} />

              <h2 className="mt-8 text-2xl font-bold">2. Tell us you&apos;ve paid</h2>
              <PaymentForm orderNumber={order.orderNumber} submittedRef={order.paymentRef} />
              {settings.whatsappNumber ? (
                <p className="mt-4 text-sm text-ink-soft">
                  Prefer WhatsApp?{" "}
                  <a className="text-pista underline" href={`https://wa.me/${settings.whatsappNumber}?text=${waText}`} target="_blank" rel="noreferrer">
                    Send us the screenshot
                  </a>
                </p>
              ) : null}
            </section>
          ) : (
            <section className="card p-6 text-[15px]">
              <p>
                {order.status === "CANCELLED"
                  ? "This order was cancelled. If you paid, the amount will be refunded to the same UPI account."
                  : isCod
                    ? `Pay ${rupees(order.total)} in cash or by UPI when your parcel arrives. We'll message you on WhatsApp when it ships.`
                    : "Your payment is confirmed. We'll message you on WhatsApp when the parcel ships."}
              </p>
            </section>
          )}
        </div>

        <aside className="card h-fit p-6">
          <h2 className="text-xl font-bold">Order details</h2>
          <ul className="mt-4 space-y-2 text-[15px]">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>
                  {i.name} ({i.unit}) <span className="text-ink-mute">× {i.qty}</span>
                </span>
                <span className="rate-num">{rupees(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-paper-line pt-4 text-[15px]">
            {order.discount ? (
              <div className="flex justify-between text-pista">
                <dt>Offer {order.couponCode}</dt>
                <dd>−{rupees(order.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>{order.shipping === 0 ? "Free" : rupees(order.shipping)}</dd>
            </div>
            {order.codFee ? (
              <div className="flex justify-between">
                <dt>Cash on delivery fee</dt>
                <dd>{rupees(order.codFee)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between text-lg font-bold">
              <dt>Total</dt>
              <dd className="rate-num">{rupees(order.total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-ink-soft">
            Delivering to {order.name}, {order.addressLine}, {order.city}, {order.state} {order.pincode}
          </p>
        </aside>
      </div>
    </div>
  );
}
