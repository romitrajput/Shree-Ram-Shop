import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless|monitor/i;

const Event = z.object({
  type: z.enum([
    "page_view",
    "product_view",
    "add_to_cart",
    "remove_from_cart",
    "begin_checkout",
    "order_placed",
    "search",
    "enquiry_submitted"
  ]),
  visitorId: z.string().min(8).max(64),
  sessionId: z.string().min(8).max(64),
  isNewVisitor: z.boolean().optional(),
  path: z.string().max(300),
  productId: z.string().max(40).optional(),
  value: z.number().int().min(0).max(1e10).optional(),
  query: z.string().max(100).optional(),
  resultCount: z.number().int().min(0).max(100000).optional(),
  referrer: z.string().max(200).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional()
});

function deviceFrom(ua: string) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  if (BOT.test(ua)) return new NextResponse(null, { status: 204 });
  // Don't count the owner browsing their own admin panel.
  if (req.headers.get("cookie")?.includes("srt_admin=")) return new NextResponse(null, { status: 204 });

  let parsed;
  try {
    parsed = Event.safeParse(await req.json());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const e = parsed.data;
  if (e.path.startsWith("/admin")) return new NextResponse(null, { status: 204 });

  await db.analyticsEvent.create({
    data: {
      ...e,
      isNewVisitor: e.isNewVisitor ?? false,
      query: e.query?.toLowerCase().trim(),
      device: deviceFrom(ua)
    }
  });
  return new NextResponse(null, { status: 204 });
}
