import "server-only";
import QRCode from "qrcode";

/** Build a standard UPI intent link (works with GPay, PhonePe, Paytm, BHIM…). */
export function upiLink(opts: { upiId: string; payeeName: string; amountPaise: number; note: string }) {
  const params = new URLSearchParams({
    pa: opts.upiId,
    pn: opts.payeeName,
    am: (opts.amountPaise / 100).toFixed(2),
    cu: "INR",
    tn: opts.note.slice(0, 50)
  });
  return `upi://pay?${params.toString()}`;
}

/** QR code (as a data: URL) that opens the UPI app with amount and order number pre-filled. */
export async function upiQrDataUrl(link: string) {
  return QRCode.toDataURL(link, { margin: 1, width: 320, color: { dark: "#1E1A16", light: "#FFFFFF" } });
}
