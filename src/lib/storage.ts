import "server-only";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * File storage for product images and payment screenshots.
 * Files live in UPLOAD_DIR (a Docker volume on the server) and are served by
 * /api/uploads/[...path]. To move to S3 / Cloudflare R2 later, replace these
 * two functions — nothing else in the app touches the filesystem.
 */
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif"
};
const MAX_BYTES = 5 * 1024 * 1024;

export function uploadDir() {
  return UPLOAD_DIR;
}

export async function saveImage(file: File, folder: "products" | "payments" | "settings"): Promise<string> {
  if (!file || file.size === 0) throw new Error("No file selected");
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("Use a JPG, PNG, WebP or AVIF image");
  if (file.size > MAX_BYTES) throw new Error("Image must be under 5 MB");

  const bytes = Buffer.from(await file.arrayBuffer());
  // Check magic bytes so a renamed file can't sneak through.
  const sig = bytes.subarray(0, 12).toString("hex");
  const looksLikeImage =
    sig.startsWith("ffd8ff") || sig.startsWith("89504e47") || bytes.subarray(8, 12).toString() === "WEBP" || bytes.subarray(4, 12).toString().includes("ftypavi");
  if (!looksLikeImage) throw new Error("That file is not a valid image");

  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const dir = path.join(UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return `/api/uploads/${folder}/${name}`;
}

export async function deleteImage(url: string) {
  if (!url.startsWith("/api/uploads/")) return;
  const rel = url.replace("/api/uploads/", "");
  const full = path.resolve(UPLOAD_DIR, rel);
  if (!full.startsWith(UPLOAD_DIR)) return;
  await unlink(full).catch(() => undefined);
}
