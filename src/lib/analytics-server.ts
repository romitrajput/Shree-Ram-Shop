import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { rupees } from "./format";

/**
 * Builds everything the owner dashboard shows from the AnalyticsEvent and
 * Order tables. All heavy lifting is done in SQL; the results are small.
 * Dates are bucketed in India time (Asia/Kolkata).
 */

const IST = Prisma.sql`("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')`;
const n = (v: unknown) => Number(v ?? 0);

export type Kpi = { value: number; prev: number };
export type DailyPoint = { date: string; visitors: number; orders: number; revenue: number };
export type SourceRow = { source: string; sessions: number; orders: number; conversion: number; bounce: number };
export type ProductRow = {
  id: string;
  name: string;
  views: number;
  cartRate: number;
  units: number;
  revenue: number;
  stock: number;
};
export type Insight = { tone: "good" | "warning" | "info"; title: string; detail: string };

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

function classifySource(referrer: string | null, utm: string | null): string {
  const r = (utm || referrer || "").toLowerCase();
  if (!r) return "Direct / typed URL";
  if (/google|bing|duckduckgo|yahoo/.test(r)) return utm ? `Google ads / ${utm}` : "Search engines";
  if (/whatsapp|wa\.me/.test(r)) return "WhatsApp";
  if (/instagram/.test(r)) return "Instagram";
  if (/facebook|fb\.|meta/.test(r)) return "Facebook";
  if (/youtube/.test(r)) return "YouTube";
  if (/indiamart|justdial|tradeindia/.test(r)) return "B2B directories";
  return utm ? utm : r;
}

export async function getDashboard(days: number) {
  const now = new Date();
  const from = new Date(now.getTime() - days * 86400_000);
  const prevFrom = new Date(from.getTime() - days * 86400_000);
  const notCancelled = Prisma.sql`"status" <> 'CANCELLED'`;

  const [
    traffic,
    trafficPrev,
    orderAgg,
    orderAggPrev,
    dailyTraffic,
    dailyOrders,
    funnel,
    sessionGroups,
    productEvents,
    productSales,
    searches,
    pages,
    hourly,
    customerMix,
    repeat,
    unpaid,
    enquiries
  ] = await Promise.all([
    db.$queryRaw<{ visitors: bigint; sessions: bigint; pageviews: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorId") visitors, COUNT(DISTINCT "sessionId") sessions,
             COUNT(*) FILTER (WHERE type = 'page_view') pageviews
      FROM "AnalyticsEvent" WHERE "createdAt" >= ${from} AND "createdAt" < ${now}`,
    db.$queryRaw<{ visitors: bigint; sessions: bigint; pageviews: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorId") visitors, COUNT(DISTINCT "sessionId") sessions,
             COUNT(*) FILTER (WHERE type = 'page_view') pageviews
      FROM "AnalyticsEvent" WHERE "createdAt" >= ${prevFrom} AND "createdAt" < ${from}`,
    db.$queryRaw<{ orders: bigint; revenue: bigint }[]>`
      SELECT COUNT(*) orders, COALESCE(SUM(total), 0) revenue FROM "Order"
      WHERE "createdAt" >= ${from} AND ${notCancelled}`,
    db.$queryRaw<{ orders: bigint; revenue: bigint }[]>`
      SELECT COUNT(*) orders, COALESCE(SUM(total), 0) revenue FROM "Order"
      WHERE "createdAt" >= ${prevFrom} AND "createdAt" < ${from} AND ${notCancelled}`,
    db.$queryRaw<{ d: string; visitors: bigint }[]>`
      SELECT to_char(${IST}, 'YYYY-MM-DD') d, COUNT(DISTINCT "visitorId") visitors
      FROM "AnalyticsEvent" WHERE "createdAt" >= ${from} GROUP BY d`,
    db.$queryRaw<{ d: string; orders: bigint; revenue: bigint }[]>`
      SELECT to_char(${IST}, 'YYYY-MM-DD') d, COUNT(*) orders, COALESCE(SUM(total), 0) revenue
      FROM "Order" WHERE "createdAt" >= ${from} AND ${notCancelled} GROUP BY d`,
    db.$queryRaw<{ sessions: bigint; viewed: bigint; carted: bigint; checkout: bigint; ordered: bigint }[]>`
      SELECT COUNT(DISTINCT "sessionId") sessions,
        COUNT(DISTINCT "sessionId") FILTER (WHERE type = 'product_view') viewed,
        COUNT(DISTINCT "sessionId") FILTER (WHERE type = 'add_to_cart') carted,
        COUNT(DISTINCT "sessionId") FILTER (WHERE type = 'begin_checkout') checkout,
        COUNT(DISTINCT "sessionId") FILTER (WHERE type = 'order_placed') ordered
      FROM "AnalyticsEvent" WHERE "createdAt" >= ${from}`,
    // One row per (source, device, new/returning) with session outcomes.
    db.$queryRaw<{ referrer: string | null; utm: string | null; device: string | null; is_new: boolean; sessions: bigint; ordered: bigint; bounced: bigint }[]>`
      WITH s AS (
        SELECT "sessionId",
          (ARRAY_AGG("referrer" ORDER BY "createdAt"))[1] referrer,
          (ARRAY_AGG("utmSource" ORDER BY "createdAt"))[1] utm,
          (ARRAY_AGG("device" ORDER BY "createdAt"))[1] device,
          BOOL_OR("isNewVisitor") is_new,
          BOOL_OR(type = 'order_placed') ordered,
          COUNT(*) FILTER (WHERE type = 'page_view') pages
        FROM "AnalyticsEvent" WHERE "createdAt" >= ${from} GROUP BY "sessionId")
      SELECT referrer, utm, device, is_new, COUNT(*) sessions,
        COUNT(*) FILTER (WHERE ordered) ordered, COUNT(*) FILTER (WHERE pages <= 1 AND NOT ordered) bounced
      FROM s GROUP BY referrer, utm, device, is_new`,
    db.$queryRaw<{ productId: string; views: bigint; view_sessions: bigint; cart_sessions: bigint }[]>`
      SELECT "productId", COUNT(*) FILTER (WHERE type = 'product_view') views,
        COUNT(DISTINCT "sessionId") FILTER (WHERE type = 'product_view') view_sessions,
        COUNT(DISTINCT "sessionId") FILTER (WHERE type = 'add_to_cart') cart_sessions
      FROM "AnalyticsEvent" WHERE "createdAt" >= ${from} AND "productId" IS NOT NULL GROUP BY "productId"`,
    db.$queryRaw<{ productId: string; units: bigint; revenue: bigint }[]>`
      SELECT i."productId", SUM(i.qty) units, SUM(i."lineTotal") revenue
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
      WHERE o."createdAt" >= ${from} AND o."status" <> 'CANCELLED' AND i."productId" IS NOT NULL GROUP BY i."productId"`,
    db.$queryRaw<{ query: string; searches: bigint; results: number | null }[]>`
      SELECT query, COUNT(*) searches, MIN("resultCount") results FROM "AnalyticsEvent"
      WHERE type = 'search' AND "createdAt" >= ${from} AND query IS NOT NULL
      GROUP BY query ORDER BY searches DESC LIMIT 20`,
    db.$queryRaw<{ path: string; views: bigint }[]>`
      SELECT path, COUNT(*) views FROM "AnalyticsEvent"
      WHERE type = 'page_view' AND "createdAt" >= ${from} GROUP BY path ORDER BY views DESC LIMIT 10`,
    db.$queryRaw<{ h: number; sessions: bigint; orders: bigint }[]>`
      SELECT EXTRACT(HOUR FROM ${IST})::int h, COUNT(DISTINCT "sessionId") sessions,
        COUNT(*) FILTER (WHERE type = 'order_placed') orders
      FROM "AnalyticsEvent" WHERE "createdAt" >= ${from} GROUP BY h`,
    db.$queryRaw<{ customerType: string; orders: bigint; revenue: bigint }[]>`
      SELECT "customerType", COUNT(*) orders, COALESCE(SUM(total), 0) revenue FROM "Order"
      WHERE "createdAt" >= ${from} AND ${notCancelled} GROUP BY "customerType"`,
    db.$queryRaw<{ customers: bigint; repeaters: bigint }[]>`
      SELECT COUNT(*) customers, COUNT(*) FILTER (WHERE c > 1) repeaters FROM (
        SELECT phone, COUNT(*) c FROM "Order" WHERE ${notCancelled} GROUP BY phone) t`,
    db.order.count({ where: { status: "PENDING_PAYMENT", createdAt: { lt: new Date(now.getTime() - 86400_000) } } }),
    db.corporateEnquiry.groupBy({ by: ["status"], where: { createdAt: { gte: from } }, _count: true })
  ]);

  // ---- KPIs ----
  const t = traffic[0];
  const tp = trafficPrev[0];
  const o = orderAgg[0];
  const op = orderAggPrev[0];
  const sessions = n(t?.sessions);
  const orders = n(o?.orders);
  const revenue = n(o?.revenue);
  const kpis = {
    visitors: { value: n(t?.visitors), prev: n(tp?.visitors) },
    pageviews: { value: n(t?.pageviews), prev: n(tp?.pageviews) },
    orders: { value: orders, prev: n(op?.orders) },
    revenue: { value: revenue, prev: n(op?.revenue) },
    conversion: { value: sessions ? n(funnel[0]?.ordered) / sessions : 0, prev: 0 },
    aov: { value: orders ? revenue / orders : 0, prev: n(op?.orders) ? n(op?.revenue) / n(op?.orders) : 0 }
  } satisfies Record<string, Kpi>;
  const prevSessions = n(tp?.sessions);
  if (prevSessions) {
    const prevOrdered = await db.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(DISTINCT "sessionId") c FROM "AnalyticsEvent"
      WHERE type = 'order_placed' AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}`;
    kpis.conversion.prev = n(prevOrdered[0]?.c) / prevSessions;
  }

  // ---- Daily series (fill empty days) ----
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const daily: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = fmt.format(new Date(now.getTime() - i * 86400_000));
    const tr = dailyTraffic.find((r) => r.d === d);
    const or = dailyOrders.find((r) => r.d === d);
    daily.push({ date: d, visitors: n(tr?.visitors), orders: n(or?.orders), revenue: n(or?.revenue) });
  }

  // ---- Funnel ----
  const f = funnel[0];
  const funnelSteps = [
    { label: "Visited the site", value: n(f?.sessions) },
    { label: "Viewed a product", value: n(f?.viewed) },
    { label: "Added to cart", value: n(f?.carted) },
    { label: "Started checkout", value: n(f?.checkout) },
    { label: "Placed order", value: n(f?.ordered) }
  ];

  // ---- Sources, devices, new vs returning ----
  const bySource = new Map<string, SourceRow>();
  const byDevice = new Map<string, SourceRow>();
  let newSessions = 0;
  let returningSessions = 0;
  let returningOrders = 0;
  let newOrders = 0;
  for (const g of sessionGroups) {
    const s = n(g.sessions);
    const ord = n(g.ordered);
    const b = n(g.bounced);
    for (const [map, key] of [
      [bySource, classifySource(g.referrer, g.utm)],
      [byDevice, g.device ?? "unknown"]
    ] as const) {
      const row = map.get(key) ?? { source: key, sessions: 0, orders: 0, conversion: 0, bounce: 0 };
      row.sessions += s;
      row.orders += ord;
      row.bounce += b;
      map.set(key, row);
    }
    if (g.is_new) {
      newSessions += s;
      newOrders += ord;
    } else {
      returningSessions += s;
      returningOrders += ord;
    }
  }
  const finish = (m: Map<string, SourceRow>) =>
    [...m.values()]
      .map((r) => ({ ...r, conversion: r.sessions ? r.orders / r.sessions : 0, bounce: r.sessions ? r.bounce / r.sessions : 0 }))
      .sort((a, b) => b.sessions - a.sessions);
  const sources = finish(bySource);
  const devices = finish(byDevice);

  // ---- Products ----
  const ids = [...new Set([...productEvents.map((p) => p.productId), ...productSales.map((p) => p.productId)])];
  const catalog = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, stock: true } });
  const products: ProductRow[] = catalog
    .map((p) => {
      const ev = productEvents.find((e) => e.productId === p.id);
      const sale = productSales.find((s) => s.productId === p.id);
      const viewSessions = n(ev?.view_sessions);
      return {
        id: p.id,
        name: p.name,
        stock: p.stock,
        views: n(ev?.views),
        cartRate: viewSessions ? n(ev?.cart_sessions) / viewSessions : 0,
        units: n(sale?.units),
        revenue: n(sale?.revenue)
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.views - a.views);

  // ---- Hourly ----
  const hours = Array.from({ length: 24 }, (_, h) => {
    const r = hourly.find((x) => x.h === h);
    return { hour: h, sessions: n(r?.sessions), orders: n(r?.orders) };
  });

  const searchRows = searches.map((s) => ({ query: s.query, searches: n(s.searches), results: s.results ?? 0 }));
  const pageRows = pages.map((p) => ({ path: p.path, views: n(p.views) }));
  const mix = customerMix.map((c) => ({ type: c.customerType, orders: n(c.orders), revenue: n(c.revenue) }));
  const repeatRate = n(repeat[0]?.customers) ? n(repeat[0]?.repeaters) / n(repeat[0]?.customers) : 0;
  const enquiryCounts = Object.fromEntries(enquiries.map((e) => [e.status, e._count])) as Record<string, number>;

  // ---- Growth insights: plain-language suggestions from the numbers ----
  const insights: Insight[] = [];
  const carted = n(f?.carted);
  const orderedSessions = n(f?.ordered);
  if (carted >= 10) {
    const abandon = 1 - orderedSessions / carted;
    if (abandon > 0.6)
      insights.push({
        tone: "warning",
        title: `${Math.round(abandon * 100)}% of carts are not turning into orders`,
        detail:
          "Check the checkout on a phone, show delivery charges earlier, and consider lowering the free-delivery limit. Following up on WhatsApp with people who started checkout recovers many of these."
      });
  }
  for (const p of products.filter((p) => p.views >= 25 && p.cartRate < 0.04).slice(0, 2)) {
    insights.push({
      tone: "warning",
      title: `${p.name}: many views, few add to cart`,
      detail: `${p.views} views but only ${(p.cartRate * 100).toFixed(1)}% of viewers add it. Compare the price with local market rates and add clearer close-up photos.`
    });
  }
  const zero = searchRows.filter((s) => s.results === 0 && s.searches >= 2).slice(0, 4);
  if (zero.length)
    insights.push({
      tone: "info",
      title: "Customers are searching for things they can't find",
      detail: `Searches with no results: ${zero.map((z) => `“${z.query}” (${z.searches})`).join(", ")}. Stock these, or add the words as search keywords on a matching product.`
    });
  const bigSources = sources.filter((s) => s.sessions >= 20);
  if (bigSources.length >= 2) {
    const best = [...bigSources].sort((a, b) => b.conversion - a.conversion)[0];
    insights.push({
      tone: "good",
      title: `${best.source} brings your best buyers`,
      detail: `${(best.conversion * 100).toFixed(1)}% of visits from ${best.source} end in an order. Put more effort into this channel.`
    });
  }
  const mobile = devices.find((d) => d.source === "mobile");
  if (mobile && sessions && mobile.sessions / sessions > 0.65)
    insights.push({
      tone: "info",
      title: `${Math.round((mobile.sessions / sessions) * 100)}% of visitors are on a phone`,
      detail: "Always test new features on a phone in the test environment before approving them for the live shop."
    });
  const peak = [...hours].sort((a, b) => b.sessions - a.sessions)[0];
  if (peak && peak.sessions >= 10)
    insights.push({
      tone: "info",
      title: `Busiest hour: ${peak.hour}:00–${peak.hour + 1}:00`,
      detail: "Send WhatsApp broadcasts and post on Instagram about an hour before this time to catch people when they shop."
    });
  const lowStock = products.filter((p) => p.units > 0 && p.stock <= Math.max(5, p.units * 0.25)).slice(0, 3);
  if (lowStock.length)
    insights.push({
      tone: "warning",
      title: "Best sellers running low",
      detail: lowStock.map((p) => `${p.name} (${p.stock} left)`).join(", ") + ". Restock before they sell out."
    });
  if (unpaid > 0)
    insights.push({
      tone: "warning",
      title: `${unpaid} order${unpaid > 1 ? "s" : ""} unpaid for over a day`,
      detail: "Call or WhatsApp these customers. Many just forgot to complete the UPI payment."
    });
  if (n(repeat[0]?.customers) >= 20 && repeatRate < 0.15)
    insights.push({
      tone: "info",
      title: `Only ${Math.round(repeatRate * 100)}% of customers have ordered again`,
      detail: "Add a small thank-you note with a repeat-order offer in each parcel, and keep a WhatsApp broadcast list of past buyers."
    });
  if (kpis.revenue.prev > 0 && revenue > kpis.revenue.prev * 1.2)
    insights.push({
      tone: "good",
      title: "Sales are growing",
      detail: `Revenue is up ${Math.round((revenue / kpis.revenue.prev - 1) * 100)}% on the previous ${days} days (${rupees(kpis.revenue.prev)} → ${rupees(revenue)}).`
    });

  return {
    days,
    kpis,
    daily,
    funnel: funnelSteps,
    sources,
    devices,
    newVsReturning: { newSessions, returningSessions, newOrders, returningOrders },
    products,
    searches: searchRows,
    pages: pageRows,
    hours,
    mix,
    repeatRate,
    enquiryCounts,
    insights
  };
}
