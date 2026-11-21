/**
 * Seeds the catalogue, shop settings and the owner account.
 *   npm run db:seed                 -> products + owner
 *   SEED_DEMO_ANALYTICS=1 npm run db:seed -> also 30 days of sample traffic (refused in production)
 * Safe to run more than once: products are upserted by slug.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES, PRODUCTS } from "./seed-data";

const db = new PrismaClient();
const r = (rupees: number) => Math.round(rupees * 100);
const price = (mrp: number, pct: number) => Math.round((mrp * (100 - pct)) / 100 / 100) * 100; // whole rupees


async function main() {
  for (const c of CATEGORIES) await db.category.upsert({ where: { slug: c.slug }, create: c, update: c });
  const cats = await db.category.findMany();

  for (const p of PRODUCTS) {
    const slug = p.name.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-");
    const data = {
      name: p.name,
      slug,
      categoryId: cats.find((c) => c.slug === p.cat)?.id,
      unit: p.unit,
      origin: p.origin,
      tags: p.tags,
      shortDescription: p.short,
      description: `${p.short}\n\nStore in an airtight container in a cool, dry place. Best within 6 months of packing.`,
      mrp: r(p.mrp),
      discountPct: p.off,
      price: price(r(p.mrp), p.off),
      stock: p.stock,
      isFeatured: p.featured,
      corporateEnabled: true,
      moq: p.moq,
      corporatePrice: r(p.corp)
    };
    await db.product.upsert({ where: { slug }, create: data, update: {} });
  }

  const defaults: Record<string, string> = {
    payeeName: "Shree Ram Trading Company",
    shippingFee: "6000",
    freeShippingAbove: "99900"
  };
  for (const [key, value] of Object.entries(defaults)) await db.setting.upsert({ where: { key }, create: { key, value }, update: {} });

  const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password && password !== "change-me") {
    await db.adminUser.upsert({
      where: { email },
      create: { email, name: "Owner", passwordHash: await bcrypt.hash(password, 12), role: "OWNER" },
      update: {}
    });
    console.log(`Owner account ready: ${email}`);
  } else {
    console.log("Skipped owner account: set ADMIN_EMAIL and ADMIN_PASSWORD (not 'change-me').");
  }

  if (process.env.SEED_DEMO_ANALYTICS === "1") {
    if (process.env.APP_ENV === "production") throw new Error("Refusing to create demo analytics in production.");
    await seedDemoAnalytics();
  }
}

/** Fake but realistic-looking traffic so the dashboard can be reviewed in the test environment. */
async function seedDemoAnalytics() {
  const products = await db.product.findMany({ select: { id: true, slug: true, price: true } });
  const sources = [
    { referrer: null, utm: null, w: 30 },
    { referrer: "google.com", utm: null, w: 30 },
    { referrer: "instagram.com", utm: null, w: 15 },
    { referrer: "l.wa.me", utm: null, w: 15 },
    { referrer: "facebook.com", utm: "diwali_campaign", w: 10 }
  ];
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const weighted = () => {
    let x = Math.random() * 100;
    for (const s of sources) if ((x -= s.w) <= 0) return s;
    return sources[0];
  };
  const events: Record<string, unknown>[] = [];
  for (let day = 29; day >= 0; day--) {
    const sessions = 20 + Math.floor(Math.random() * 25) + (30 - day);
    for (let s = 0; s < sessions; s++) {
      const hour = pick([9, 10, 11, 12, 13, 17, 18, 19, 20, 20, 21, 21, 22]);
      let t = new Date(Date.now() - day * 86400_000);
      t.setUTCHours(hour - 5, Math.floor(Math.random() * 60));
      const sessionId = `demo-${day}-${s}-${Math.random().toString(36).slice(2, 8)}`;
      const visitorId = `demo-v-${Math.floor(Math.random() * 600)}`;
      const src = weighted();
      const device = Math.random() < 0.78 ? "mobile" : "desktop";
      const base = { sessionId, visitorId, device, referrer: src.referrer, utmSource: src.utm, isNewVisitor: Math.random() < 0.7 };
      const push = (type: string, extra: Record<string, unknown> = {}) => {
        t = new Date(t.getTime() + 20_000 + Math.random() * 60_000);
        events.push({ ...base, type, path: "/", createdAt: t, ...extra });
      };
      push("page_view", { path: "/" });
      if (Math.random() < 0.35) continue; // bounced
      if (Math.random() < 0.2) push("search", { path: "/products", query: pick(["kaju", "badam", "anjeer", "makhana", "chilgoza", "pista"]), resultCount: Math.random() < 0.3 ? 0 : 3 });
      const p = pick(products);
      push("product_view", { path: `/products/${p.slug}`, productId: p.id, value: p.price });
      if (Math.random() < 0.3) {
        push("add_to_cart", { path: `/products/${p.slug}`, productId: p.id, value: p.price });
        if (Math.random() < 0.55) {
          push("begin_checkout", { path: "/checkout", value: p.price });
          if (Math.random() < 0.6) push("order_placed", { path: "/order", value: p.price });
        }
      }
    }
  }
  await db.analyticsEvent.deleteMany({ where: { sessionId: { startsWith: "demo-" } } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.analyticsEvent.createMany({ data: events as any });
  console.log(`Created ${events.length} demo analytics events.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
