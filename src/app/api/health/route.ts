import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Used by Docker healthchecks and the deploy pipeline's smoke test.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      env: process.env.APP_ENV,
      version: process.env.APP_VERSION || "dev",
      time: new Date().toISOString()
    });
  } catch {
    return Response.json({ status: "db_unreachable" }, { status: 503 });
  }
}
