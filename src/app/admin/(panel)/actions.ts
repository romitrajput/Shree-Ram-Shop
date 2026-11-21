"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteImage, saveImage } from "@/lib/storage";
import { priceAfterDiscount, slugify, toPaise } from "@/lib/format";
import { refreshRating } from "@/lib/catalog";
import { saveSettings, type ShopSettings } from "@/lib/settings";

export type AdminFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

function errorsOf(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

const bool = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const optInt = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1).optional());

// ---------------- Products ----------------

const ProductSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Enter the product name").max(120),
    slug: z.string().trim().max(140).optional(),
    categoryId: z.string().optional(),
    newCategory: z.string().trim().max(60).optional(),
    unit: z.string().trim().min(1, "Enter the pack size, e.g. 500 g").max(40),
    origin: z.string().trim().max(60).optional(),
    tags: z.string().optional(),
    shortDescription: z.string().trim().max(240).optional(),
    description: z.string().trim().max(5000).optional(),
    mrp: z.string().transform(toPaise).pipe(z.number().int().min(100, "MRP must be at least ₹1")),
    discountPct: z.coerce.number().int().min(0).max(90, "Discount can be at most 90%"),
    stock: z.coerce.number().int().min(0, "Stock can't be negative"),
    isActive: bool,
    isFeatured: bool,
    corporateEnabled: bool,
    moq: optInt,
    corporatePrice: z
      .string()
      .optional()
      .transform((v) => (v ? toPaise(v) : undefined))
  })
  .superRefine((d, ctx) => {
    if (d.corporateEnabled) {
      if (!d.moq) ctx.addIssue({ code: "custom", path: ["moq"], message: "Enter the minimum order quantity" });
      if (!d.corporatePrice) ctx.addIssue({ code: "custom", path: ["corporatePrice"], message: "Enter the corporate price per pack" });
      else if (d.corporatePrice >= priceAfterDiscount(d.mrp, d.discountPct))
        ctx.addIssue({ code: "custom", path: ["corporatePrice"], message: "Corporate price should be lower than the retail price" });
    }
  });

export async function saveProduct(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = ProductSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Fix the highlighted fields.", fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;

  let categoryId = d.categoryId || null;
  if (d.newCategory) {
    const slug = slugify(d.newCategory);
    const cat = await db.category.upsert({ where: { slug }, create: { name: d.newCategory, slug }, update: {} });
    categoryId = cat.id;
  }

  const slugBase = slugify(d.slug || d.name);
  const clash = await db.product.findFirst({ where: { slug: slugBase, NOT: d.id ? { id: d.id } : undefined } });
  if (clash) return { fieldErrors: { slug: "Another product already uses this URL. Change the name or URL." } };

  const data = {
    name: d.name,
    slug: slugBase,
    categoryId,
    unit: d.unit,
    origin: d.origin || null,
    tags: (d.tags || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
    shortDescription: d.shortDescription || null,
    description: d.description || "",
    mrp: d.mrp,
    discountPct: d.discountPct,
    price: priceAfterDiscount(d.mrp, d.discountPct),
    stock: d.stock,
    isActive: d.isActive,
    isFeatured: d.isFeatured,
    corporateEnabled: d.corporateEnabled,
    moq: d.corporateEnabled ? d.moq! : null,
    corporatePrice: d.corporateEnabled ? d.corporatePrice! : null
  };

  // Upload new images first so a bad file doesn't leave a half-saved product.
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const uploaded: string[] = [];
  try {
    for (const f of files) uploaded.push(await saveImage(f, "products"));
  } catch (e) {
    await Promise.all(uploaded.map(deleteImage));
    return { fieldErrors: { images: (e as Error).message } };
  }

  const product = d.id ? await db.product.update({ where: { id: d.id }, data }) : await db.product.create({ data });

  // Existing images: remove ticked ones, update alt text.
  const removeIds = form.getAll("removeImage").map(String);
  if (removeIds.length) {
    const doomed = await db.productImage.findMany({ where: { id: { in: removeIds }, productId: product.id } });
    await db.productImage.deleteMany({ where: { id: { in: doomed.map((i) => i.id) } } });
    await Promise.all(doomed.map((i) => deleteImage(i.url)));
  }
  for (const [key, value] of form.entries()) {
    if (key.startsWith("alt_")) {
      await db.productImage.updateMany({ where: { id: key.slice(4), productId: product.id }, data: { alt: String(value).slice(0, 150) } });
    }
  }
  if (uploaded.length) {
    const max = await db.productImage.aggregate({ where: { productId: product.id }, _max: { sortOrder: true } });
    const start = (max._max.sortOrder ?? -1) + 1;
    await db.productImage.createMany({ data: uploaded.map((url, i) => ({ productId: product.id, url, alt: d.name, sortOrder: start + i })) });
  }
  const cover = form.get("coverImage");
  if (cover) {
    const imgs = await db.productImage.findMany({ where: { productId: product.id }, orderBy: { sortOrder: "asc" } });
    const ordered = [...imgs.filter((i) => i.id === cover), ...imgs.filter((i) => i.id !== cover)];
    await Promise.all(ordered.map((img, i) => db.productImage.update({ where: { id: img.id }, data: { sortOrder: i } })));
  }

  revalidatePath("/", "layout");
  if (!d.id) redirect(`/admin/products/${product.id}?saved=1`);
  return { ok: true };
}

export async function deleteProduct(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const hasOrders = await db.orderItem.count({ where: { productId: id } });
  if (hasOrders) {
    // Keep history intact: hide instead of deleting.
    await db.product.update({ where: { id }, data: { isActive: false } });
  } else {
    const imgs = await db.productImage.findMany({ where: { productId: id } });
    await db.product.delete({ where: { id } });
    await Promise.all(imgs.map((i) => deleteImage(i.url)));
  }
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function quickUpdateProduct(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const stock = Number(form.get("stock"));
  const discountPct = Number(form.get("discountPct"));
  const p = await db.product.findUnique({ where: { id } });
  if (!p || !Number.isFinite(stock) || !Number.isFinite(discountPct)) return;
  const pct = Math.min(90, Math.max(0, Math.round(discountPct)));
  await db.product.update({
    where: { id },
    data: { stock: Math.max(0, Math.round(stock)), discountPct: pct, price: priceAfterDiscount(p.mrp, pct) }
  });
  revalidatePath("/", "layout");
}

// ---------------- Orders ----------------

const NEXT_STATUS = ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export async function updateOrderStatus(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const status = String(form.get("status")) as (typeof NEXT_STATUS)[number];
  if (!NEXT_STATUS.includes(status)) return;
  if (status === "CANCELLED" && form.get("confirm") !== "on") return; // cancelling needs the confirmation tick
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order || order.status === "CANCELLED") return;

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        status,
        // UPI orders are paid when confirmed; cash-on-delivery orders when delivered
        ...(status === "CONFIRMED" && !order.paidAt && order.paymentMethod !== "COD" ? { paidAt: new Date() } : {}),
        ...(status === "DELIVERED" && !order.paidAt && order.paymentMethod === "COD" ? { paidAt: new Date() } : {})
      }
    });
    if (status === "CANCELLED") {
      // Put reserved stock back on the shelf.
      for (const i of order.items) if (i.productId) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.qty } } });
    }
  });
  revalidatePath("/admin", "layout");
}

// ---------------- Reviews ----------------

export async function moderateReview(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const action = String(form.get("action"));
  const review = await db.review.findUnique({ where: { id } });
  if (!review) return;
  if (action === "delete") await db.review.delete({ where: { id } });
  else if (action === "approve" || action === "reject")
    await db.review.update({ where: { id }, data: { status: action === "approve" ? "APPROVED" : "REJECTED" } });
  await refreshRating(review.productId);
  revalidatePath("/", "layout");
}

const AdminReview = z.object({
  productId: z.string().min(1, "Choose a product"),
  name: z.string().trim().min(2, "Enter the customer's name").max(60),
  city: z.string().trim().max(60).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().min(5, "Enter the review text").max(1500)
});

/** Owner adds a review collected offline (WhatsApp, in-store, phone). */
export async function addReview(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = AdminReview.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  await db.review.create({ data: { ...d, city: d.city || null, title: d.title || null, status: "APPROVED", source: "ADMIN" } });
  await refreshRating(d.productId);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------- Corporate enquiries ----------------

export async function updateEnquiry(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const status = String(form.get("status"));
  if (!["NEW", "CONTACTED", "QUOTED", "WON", "LOST"].includes(status)) return;
  await db.corporateEnquiry.update({
    where: { id },
    data: { status: status as "NEW", ownerNotes: String(form.get("ownerNotes") || "").slice(0, 2000) || null }
  });
  revalidatePath("/admin", "layout");
}

// ---------------- Settings ----------------

const SettingsSchema = z.object({
  upiId: z.union([z.literal(""), z.string().trim().regex(/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/, "Enter a UPI ID like shreeram@okhdfcbank")]),
  payeeName: z.string().trim().min(2).max(60),
  shippingFee: z.string().transform(toPaise),
  freeShippingAbove: z.string().transform(toPaise),
  whatsappNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || /^91[6-9]\d{9}$/.test(v) || /^[6-9]\d{9}$/.test(v), "Enter a 10-digit mobile number")
    .transform((v) => (v.length === 10 ? `91${v}` : v)),
  phone: z.string().trim().max(20),
  email: z.union([z.literal(""), z.string().trim().email()]),
  address: z.string().trim().max(300),
  gstin: z.string().trim().toUpperCase().max(15),
  codEnabled: bool,
  codLimit: z.string().transform(toPaise),
  codFee: z.string().transform(toPaise),
  localPinPrefixes: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || /^\d{1,6}(\s*,\s*\d{1,6})*$/.test(v), "Use PIN prefixes separated by commas, e.g. 411, 412"),
  localDays: z.string().trim().min(1).max(20),
  otherDays: z.string().trim().min(1).max(20)
});

export async function updateSettings(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") return { error: "Only the owner can change shop settings." };
  const parsed = SettingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: errorsOf(parsed.error) };
  const values: Partial<ShopSettings> = parsed.data;

  const qr = form.get("qrImage");
  if (qr instanceof File && qr.size > 0) {
    try {
      values.qrImageUrl = await saveImage(qr, "settings");
    } catch (e) {
      return { fieldErrors: { qrImage: (e as Error).message } };
    }
  }
  if (form.get("removeQr") === "on") values.qrImageUrl = "";
  await saveSettings(values);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------- Coupons ----------------

const CouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,20}$/, "3–20 letters or numbers, e.g. DIWALI10"),
    kind: z.enum(["PERCENT", "FLAT"]),
    value: z.coerce.number().positive("Enter the discount"),
    minOrder: z.string().optional().transform((v) => (v ? toPaise(v) : 0)),
    maxDiscount: z.string().optional().transform((v) => (v ? toPaise(v) : null)),
    expiresAt: z.string().optional().transform((v) => (v ? new Date(`${v}T23:59:59+05:30`) : null)),
    usageLimit: optInt,
    forCorporate: bool
  })
  .superRefine((d, ctx) => {
    if (d.kind === "PERCENT" && (d.value < 1 || d.value > 90 || !Number.isInteger(d.value)))
      ctx.addIssue({ code: "custom", path: ["value"], message: "Percent must be a whole number from 1 to 90" });
  });

export async function createCoupon(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = CouponSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: errorsOf(parsed.error) };
  const d = parsed.data;
  if (await db.coupon.findUnique({ where: { code: d.code } })) return { fieldErrors: { code: `${d.code} already exists` } };
  await db.coupon.create({
    data: {
      code: d.code,
      kind: d.kind,
      value: d.kind === "PERCENT" ? d.value : toPaise(d.value),
      minOrder: d.minOrder,
      maxDiscount: d.kind === "PERCENT" ? d.maxDiscount : null,
      expiresAt: d.expiresAt,
      usageLimit: d.usageLimit ?? null,
      forCorporate: d.forCorporate
    }
  });
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function toggleCoupon(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const c = await db.coupon.findUnique({ where: { id } });
  if (!c) return;
  await db.coupon.update({ where: { id }, data: { active: !c.active } });
  revalidatePath("/admin/coupons");
}

// ---------------- Unfinished checkouts ----------------

export async function markLeadContacted(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  await db.checkoutLead.update({ where: { id }, data: { contactedAt: new Date() } });
  revalidatePath("/admin", "layout");
}
