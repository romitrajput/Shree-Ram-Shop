"use client";

import { useState } from "react";

/**
 * How to pay. On a phone the customer can't scan a QR shown on that same phone,
 * so phones get the "open UPI app" button first and the QR is for paying from
 * another device. On a computer the QR comes first.
 */
export function PayOptions({ link, qr, upiId, payee, amount }: { link: string | null; qr: string | null; upiId: string; payee: string; amount: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  if (!link && !qr) {
    return <p className="mt-4 rounded-lg bg-khata-light p-4 text-khata">Online payment isn&apos;t set up yet. Please call or WhatsApp us to pay.</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
      {link ? (
        <div className="space-y-2 sm:hidden">
          <a href={link} className="btn-accent w-full !py-3.5 text-base">
            Pay {amount} with a UPI app
          </a>
          <p className="text-sm text-ink-soft">Opens GPay, PhonePe, Paytm or BHIM with the amount and order number filled in.</p>
        </div>
      ) : null}

      {qr ? (
        <figure>
          <p className="mb-2 text-sm font-medium text-ink-soft sm:hidden">Paying from another phone? Scan this code:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`UPI QR code to pay ${amount} to ${payee}`} className="h-56 w-56 rounded-lg border border-paper-line bg-white p-2" />
        </figure>
      ) : null}

      <div className="space-y-3 text-[15px]">
        <p className="hidden sm:block">
          Scan with GPay, PhonePe, Paytm or any UPI app. The amount <strong className="rate-num">{amount}</strong> and order number are filled in for you.
        </p>
        {upiId ? (
          <div>
            <p className="text-sm text-ink-soft">Or pay to UPI ID ({payee})</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="rounded-lg bg-paper px-3 py-2 font-body font-semibold text-ink">{upiId}</code>
              <button type="button" onClick={copy} className="btn-ghost min-h-[44px] !py-2 text-sm">
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="sr-only" aria-live="polite">
              {copied ? "UPI ID copied" : ""}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
