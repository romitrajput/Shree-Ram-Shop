// Shared helpers that are safe on both server and client.

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

/** Format integer paise as rupees, e.g. 54900 -> "₹549". */
export function rupees(paise: number, exact = false): string {
  const value = paise / 100;
  return exact || value % 1 !== 0 ? inrExact.format(value) : inr.format(value);
}

/** Rupees (from a form) -> paise. */
export function toPaise(value: string | number): number {
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Selling price after discount, rounded to whole rupees (traders don't quote paise). */
export function priceAfterDiscount(mrp: number, discountPct: number): number {
  const pct = Math.min(90, Math.max(0, Math.round(discountPct)));
  return Math.round((mrp * (100 - pct)) / 100 / 100) * 100;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  PAYMENT_SUBMITTED: "Payment to verify",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled"
};
