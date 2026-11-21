"use client";

/**
 * First-party analytics. No cookies with personal data, no third parties:
 * an anonymous visitor id (localStorage, 1 year) and a 30-minute rolling
 * session id. Events are sent with sendBeacon so they never slow the page.
 */
export type TrackType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "order_placed"
  | "search"
  | "enquiry_submitted";

type SessionInfo = {
  visitorId: string;
  sessionId: string;
  isNewVisitor: boolean;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

const SESSION_MS = 30 * 60 * 1000;

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: analytics simply degrades */
  }
}

export function getSession(): SessionInfo {
  const now = Date.now();
  let visitor = read<{ id: string; firstSeen: number }>("srt_vid");
  const isFirstEver = !visitor;
  if (!visitor) {
    visitor = { id: uid(), firstSeen: now };
    write("srt_vid", visitor);
  }

  let session = read<SessionInfo & { last: number }>("srt_sid");
  if (!session || now - session.last > SESSION_MS) {
    const url = new URL(window.location.href);
    let referrer: string | undefined;
    try {
      const r = document.referrer ? new URL(document.referrer).hostname : "";
      referrer = r && r !== window.location.hostname ? r.replace(/^www\./, "") : undefined;
    } catch {
      referrer = undefined;
    }
    session = {
      visitorId: visitor.id,
      sessionId: uid(),
      isNewVisitor: isFirstEver,
      referrer,
      utmSource: url.searchParams.get("utm_source") || undefined,
      utmMedium: url.searchParams.get("utm_medium") || undefined,
      utmCampaign: url.searchParams.get("utm_campaign") || undefined,
      last: now
    };
  }
  session.last = now;
  write("srt_sid", session);
  const { last: _last, ...info } = session;
  void _last;
  return info;
}

export function track(
  type: TrackType,
  data: { productId?: string; value?: number; query?: string; resultCount?: number; path?: string } = {}
) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ type, path: data.path ?? window.location.pathname, ...getSession(), ...data });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/track", blob)) {
      fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
    }
  } catch {
    /* never break the shop because of analytics */
  }
}
