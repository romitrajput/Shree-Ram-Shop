import "server-only";
import { db } from "./db";

export type ShopSettings = {
  upiId: string;
  payeeName: string;
  qrImageUrl: string; // optional uploaded QR from the owner's bank/UPI app
  shippingFee: number; // paise
  freeShippingAbove: number; // paise
  whatsappNumber: string; // with country code, digits only e.g. 919876543210
  phone: string;
  email: string;
  address: string;
  gstin: string;
  // Cash on delivery
  codEnabled: boolean;
  codLimit: number; // paise: COD only for orders up to this total
  codFee: number; // paise
  // Delivery estimate shown by the PIN-code check
  localPinPrefixes: string; // comma separated, e.g. "411,412"
  localDays: string; // e.g. "1–2"
  otherDays: string; // e.g. "3–6"
};

export const DEFAULT_SETTINGS: ShopSettings = {
  upiId: "",
  payeeName: "Shree Ram Trading Company",
  qrImageUrl: "",
  shippingFee: 6000,
  freeShippingAbove: 99900,
  whatsappNumber: "",
  phone: "",
  email: "",
  address: "",
  gstin: "",
  codEnabled: false,
  codLimit: 200000,
  codFee: 4000,
  localPinPrefixes: "",
  localDays: "1–2",
  otherDays: "3–6"
};

const NUMERIC: (keyof ShopSettings)[] = ["shippingFee", "freeShippingAbove", "codLimit", "codFee"];
const BOOLEAN: (keyof ShopSettings)[] = ["codEnabled"];

export async function getSettings(): Promise<ShopSettings> {
  const rows = await db.setting.findMany();
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (!(r.key in DEFAULT_SETTINGS)) continue;
    const k = r.key as keyof ShopSettings;
    s[r.key] = NUMERIC.includes(k) ? Number(r.value) : BOOLEAN.includes(k) ? r.value === "true" : r.value;
  }
  return s as ShopSettings;
}

export async function saveSettings(values: Partial<ShopSettings>) {
  await db.$transaction(
    Object.entries(values).map(([key, value]) =>
      db.setting.upsert({ where: { key }, create: { key, value: String(value) }, update: { value: String(value) } })
    )
  );
}

export function shippingFor(subtotal: number, s: ShopSettings) {
  return subtotal >= s.freeShippingAbove ? 0 : s.shippingFee;
}

/** Is cash on delivery offered for this order? */
export function codAllowed(total: number, hasBulkLines: boolean, s: ShopSettings) {
  return s.codEnabled && !hasBulkLines && total <= s.codLimit;
}
