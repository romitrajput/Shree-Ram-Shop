import path from "path";
import { readImage } from "@/lib/storage";
import { getAdmin } from "@/lib/auth";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  // Payment screenshots are private to the owner.
  if (parts[0] === "payments" && !(await getAdmin())) return new Response("Not found", { status: 404 });

  const type = TYPES[path.extname(parts[parts.length - 1] || "").toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });

  const data = await readImage(parts);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(data, {
    headers: {
      "content-type": type,
      "cache-control": parts[0] === "payments" ? "private, no-store" : "public, max-age=31536000, immutable"
    }
  });
}
