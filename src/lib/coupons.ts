import "server-only";
import { db } from "./db";
import { rupees } from "./format";

export type CouponResult = { ok: true; code: string; discount: number; label: string } | { ok: false; error: string };

/** Check a coupon against a cart. Used for the cart preview and again, authoritatively, when the order is placed. */
export async function evaluateCoupon(rawCode: string, subtotal: number, hasBulkLines: boolean): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter an offer code" };
  const c = await db.coupon.findUnique({ where: { code } });
  if (!c || !c.active) return { ok: false, error: `“${code}” isn't a valid offer code` };
  if (c.expiresAt && c.expiresAt < new Date()) return { ok: false, error: `“${code}” has expired` };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { ok: false, error: `“${code}” has been fully used` };
  if (hasBulkLines && !c.forCorporate) return { ok: false, error: `“${code}” isn't valid on bulk-priced items` };
  if (subtotal < c.minOrder) return { ok: false, error: `Add ${rupees(c.minOrder - subtotal)} more to use “${code}”` };

  let discount = c.kind === "PERCENT" ? Math.round((subtotal * c.value) / 100 / 100) * 100 : c.value;
  if (c.kind === "PERCENT" && c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
  discount = Math.min(discount, subtotal);
  const label = c.kind === "PERCENT" ? `${c.value}% off${c.maxDiscount ? ` (up to ${rupees(c.maxDiscount)})` : ""}` : `${rupees(c.value)} off`;
  return { ok: true, code, discount, label };
}
