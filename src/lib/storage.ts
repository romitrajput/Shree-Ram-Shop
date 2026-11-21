import "server-only";
import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * File storage for product images and payment screenshots.
 * - On a server (Docker): files live in UPLOAD_DIR, a Docker volume.
 * - On Netlify (STORAGE=netlify): files live in Netlify Blobs, because
 *   Netlify functions have no lasting disk.
 * Either way they are served by /api/uploads/[...path].
 */
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./uploads");
const USE_BLOBS = process.env.STORAGE === "netlify";
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif"
};
const MAX_BYTES = 5 * 1024 * 1024;

async function blobStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "uploads", consistency: "strong" });
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
  if (USE_BLOBS) {
    const store = await blobStore();
    await store.set(`${folder}/${name}`, new Uint8Array(bytes).buffer);
  } else {
    const dir = path.join(UPLOAD_DIR, folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
  }
  return `/api/uploads/${folder}/${name}`;
}

/** Returns the file's bytes, or null if missing or the path is unsafe. */
export async function readImage(parts: string[]): Promise<Uint8Array | null> {
  if (parts.some((p) => !p || p === "." || p === ".." || p.includes("/") || p.includes("\\"))) return null;
  if (USE_BLOBS) {
    const store = await blobStore();
    const data = await store.get(parts.join("/"), { type: "arrayBuffer" });
    return data ? new Uint8Array(data) : null;
  }
  const full = path.resolve(UPLOAD_DIR, ...parts);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return null;
  try {
    return new Uint8Array(await readFile(full));
  } catch {
    return null;
  }
}

export async function deleteImage(url: string) {
  if (!url.startsWith("/api/uploads/")) return;
  const rel = url.replace("/api/uploads/", "");
  if (rel.split("/").some((p) => !p || p === "..")) return;
  if (USE_BLOBS) {
    const store = await blobStore();
    await store.delete(rel).catch(() => undefined);
    return;
  }
  const full = path.resolve(UPLOAD_DIR, rel);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return;
  await unlink(full).catch(() => undefined);
}
