"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { codAllowed, getSettings, shippingFor } from "@/lib/settings";
import { evaluateCoupon, type CouponResult } from "@/lib/coupons";
import { saveImage } from "@/lib/storage";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+?91/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit mobile number"));

// ---------------- Reviews ----------------

const ReviewSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(2, "Enter your name").max(60),
  city: z.string().trim().max(60).optional(),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  body: z.string().trim().min(10, "Write at least a sentence").max(1500)
});

export async function submitReview(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("review", 5, 60 * 60 * 1000))) return { error: "Too many reviews from this device. Try again later." };
  const parsed = ReviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  await db.review.create({ data: { ...parsed.data, city: parsed.data.city || null, status: "PENDING", source: "CUSTOMER" } });
  return { ok: true };
}

// ---------------- Orders ----------------

const CartLine = z.object({
  productId: z.string(),
  mode: z.enum(["RETAIL", "CORPORATE"]),
  qty: z.number().int().min(1).max(100000)
});

const OrderSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone,
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  companyName: z.string().trim().max(120).optional(),
  gstin: z
    .union([z.literal(""), z.string().trim().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/, "Enter a valid 15-character GSTIN")])
    .optional(),
  addressLine: z.string().trim().min(8, "Enter house no., street and area").max(300),
  city: z.string().trim().min(2, "Enter your city").max(60),
  state: z.string().trim().min(2, "Choose your state").max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit PIN code"),
  notes: z.string().trim().max(500).optional(),
  sessionId: z.string().max(64).optional(),
  couponCode: z.string().trim().max(30).optional(),
  paymentMethod: z.enum(["UPI", "COD"]).optional(),
  cart: z.string().transform((s, ctx) => {
    try {
      return z.array(CartLine).min(1).max(50).parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "Your cart is empty" });
      return z.NEVER;
    }
  })
});

function makeOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `SRT${ymd}${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function placeOrder(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("order", 10, 60 * 60 * 1000))) return { error: "Too many orders from this device. Call us to complete your order." };
  const parsed = OrderSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const data = parsed.data;

  // Re-price every line from the database. Never trust prices sent by the browser.
  const products = await db.product.findMany({ where: { id: { in: data.cart.map((l) => l.productId) }, isActive: true } });
  const lines: { productId: string; name: string; unit: string; priceType: "RETAIL" | "CORPORATE"; unitPrice: number; qty: number; lineTotal: number }[] = [];
  for (const line of data.cart) {
    const p = products.find((x) => x.id === line.productId);
    if (!p) return { error: "One of the products in your cart is no longer available. Please remove it and try again." };
    if (p.stock < line.qty) return { error: `Only ${p.stock} packs of ${p.name} are in stock. Reduce the quantity and try again.` };
    let unitPrice = p.price;
    if (line.mode === "CORPORATE") {
      if (!p.corporateEnabled || !p.corporatePrice || !p.moq) return { error: `${p.name} is not available at corporate prices.` };
      if (line.qty < p.moq) return { error: `Corporate price for ${p.name} needs at least ${p.moq} packs.` };
      unitPrice = p.corporatePrice;
    }
    lines.push({ productId: p.id, name: p.name, unit: p.unit, priceType: line.mode, unitPrice, qty: line.qty, lineTotal: unitPrice * line.qty });
  }

  const isCorporate = lines.some((l) => l.priceType === "CORPORATE");
  if (isCorporate && !data.companyName) return { fieldErrors: { companyName: "Enter your company name for corporate pricing" } };

  const settings = await getSettings();
  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);
  const shipping = shippingFor(subtotal, settings);

  // Coupon: checked again here; the cart preview is only a hint.
  let discount = 0;
  let couponCode: string | null = null;
  if (data.couponCode) {
    const c = await evaluateCoupon(data.couponCode, subtotal, isCorporate);
    if (!c.ok) return { error: `${c.error}. Remove the code in your cart or try another one.` };
    discount = c.discount;
    couponCode = c.code;
  }

  // Cash on delivery: only when the shop offers it and the order qualifies.
  const beforeCod = subtotal - discount + shipping;
  const cod = data.paymentMethod === "COD";
  if (cod && !codAllowed(beforeCod, isCorporate, settings)) return { error: "Cash on delivery isn't available for this order. Please pay by UPI." };
  const codFee = cod ? settings.codFee : 0;

  let orderNumber = makeOrderNumber();
  for (let i = 0; i < 5 && (await db.order.findUnique({ where: { orderNumber } })); i++) orderNumber = makeOrderNumber();

  await db.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        orderNumber,
        customerType: isCorporate ? "CORPORATE" : "RETAIL",
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        companyName: data.companyName || null,
        gstin: data.gstin || null,
        addressLine: data.addressLine,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        notes: data.notes || null,
        subtotal,
        discount,
        couponCode,
        shipping,
        codFee,
        total: beforeCod + codFee,
        paymentMethod: cod ? "COD" : "UPI",
        // COD orders don't wait for a payment, so they go straight to packing
        status: cod ? "CONFIRMED" : "PENDING_PAYMENT",
        sessionId: data.sessionId || null,
        items: { create: lines }
      }
    });
    // Reserve stock now; it is returned if the owner cancels the order.
    for (const l of lines) await tx.product.update({ where: { id: l.productId }, data: { stock: { decrement: l.qty } } });
    if (couponCode) await tx.coupon.update({ where: { code: couponCode }, data: { usedCount: { increment: 1 } } });
    if (data.sessionId) await tx.checkoutLead.updateMany({ where: { sessionId: data.sessionId }, data: { orderId: orderNumber } });
  });

  redirect(`/order/${orderNumber}?placed=1&p=${data.phone.slice(-4)}`);
}

// ---------------- Payment confirmation ----------------

const PaymentSchema = z.object({
  orderNumber: z.string().min(5).max(30),
  paymentRef: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{10,22}$/, "Enter the 12-digit UPI transaction ID (UTR) shown in your payment app")
});

export async function submitPayment(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("payment", 10, 60 * 60 * 1000))) return { error: "Too many attempts. Please WhatsApp us your payment screenshot." };
  const parsed = PaymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const order = await db.order.findUnique({ where: { orderNumber: parsed.data.orderNumber } });
  if (!order) return { error: "We couldn't find that order." };
  if (order.status !== "PENDING_PAYMENT" && order.status !== "PAYMENT_SUBMITTED") return { error: "This order's payment is already confirmed." };

  let screenshot: string | undefined;
  const file = form.get("screenshot");
  if (file instanceof File && file.size > 0) {
    try {
      screenshot = await saveImage(file, "payments");
    } catch (e) {
      return { fieldErrors: { screenshot: (e as Error).message } };
    }
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      paymentRef: parsed.data.paymentRef.toUpperCase(),
      paymentScreenshot: screenshot ?? order.paymentScreenshot,
      paymentSubmittedAt: new Date(),
      status: "PAYMENT_SUBMITTED"
    }
  });
  revalidatePath(`/order/${order.orderNumber}`);
  return { ok: true };
}

// ---------------- Track order ----------------

export async function findOrder(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("track", 20, 15 * 60 * 1000))) return { error: "Too many attempts. Try again in a few minutes." };
  const orderNumber = String(form.get("orderNumber") || "").trim().toUpperCase();
  const last4 = String(form.get("phone") || "").replace(/\D/g, "").slice(-4);
  const order = await db.order.findUnique({ where: { orderNumber } });
  if (!order || order.phone.slice(-4) !== last4) return { error: "No order matches that number and phone. Check both and try again." };
  redirect(`/order/${orderNumber}?p=${last4}`);
}

// ---------------- Corporate enquiry ----------------

const EnquirySchema = z.object({
  companyName: z.string().trim().min(2, "Enter your company name").max(120),
  contactName: z.string().trim().min(2, "Enter your name").max(80),
  phone,
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  gstin: z.string().trim().max(15).optional(),
  city: z.string().trim().max(60).optional(),
  occasion: z.string().trim().max(60).optional(),
  quantity: z.string().trim().max(120).optional(),
  budget: z.string().trim().max(60).optional(),
  message: z.string().trim().min(10, "Tell us what you need").max(2000)
});

export async function submitEnquiry(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("enquiry", 5, 60 * 60 * 1000))) return { error: "Too many enquiries from this device. Please call us instead." };
  const parsed = EnquirySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  await db.corporateEnquiry.create({ data: { ...d, email: d.email || null, gstin: d.gstin || null } });
  return { ok: true };
}

// ---------------- Coupon preview (cart) ----------------

export async function checkCoupon(code: string, subtotal: number, hasBulkLines: boolean): Promise<CouponResult> {
  if (!(await rateLimit("coupon", 30, 15 * 60 * 1000))) return { ok: false, error: "Too many tries. Wait a few minutes." };
  return evaluateCoupon(String(code).slice(0, 30), Math.max(0, Math.round(Number(subtotal) || 0)), !!hasBulkLines);
}

// ---------------- Unfinished checkout (for WhatsApp follow-up) ----------------

const LeadSchema = z.object({
  sessionId: z.string().min(8).max(64),
  phone,
  name: z.string().trim().max(80).optional(),
  cart: z.array(z.object({ name: z.string().max(120), unit: z.string().max(40), qty: z.number().int().min(1), mode: z.enum(["RETAIL", "CORPORATE"]) })).min(1).max(50),
  subtotal: z.number().int().min(0)
});

/** Saved when the shopper types a valid mobile number at checkout, so the owner can follow up if they don't finish. */
export async function saveCheckoutLead(input: unknown): Promise<{ ok: boolean }> {
  if (!(await rateLimit("lead", 20, 60 * 60 * 1000))) return { ok: false };
  const parsed = LeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const d = parsed.data;
  await db.checkoutLead.upsert({
    where: { sessionId: d.sessionId },
    create: { sessionId: d.sessionId, phone: d.phone, name: d.name || null, cart: d.cart, subtotal: d.subtotal },
    update: { phone: d.phone, name: d.name || null, cart: d.cart, subtotal: d.subtotal }
  });
  return { ok: true };
}
