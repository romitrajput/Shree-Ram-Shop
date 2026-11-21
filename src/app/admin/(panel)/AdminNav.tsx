"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Badges = Record<"orders" | "reviews" | "enquiries" | "checkouts", number>;

const ITEMS = [
  { href: "/admin", label: "Analytics" },
  { href: "/admin/orders", label: "Orders", badge: "orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/checkouts", label: "Unfinished checkouts", badge: "checkouts" },
  { href: "/admin/reviews", label: "Reviews", badge: "reviews" },
  { href: "/admin/enquiries", label: "Corporate enquiries", badge: "enquiries" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/settings", label: "Shop settings" }
] as const;

const isActive = (path: string, href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

function Count({ n, active }: { n: number; active?: boolean }) {
  if (!n) return null;
  return <span className={`rate-num rounded-full px-2 text-xs font-semibold leading-5 ${active ? "bg-white text-pista" : "bg-marigold text-ink"}`}>{n}</span>;
}

/** Desktop / tablet: side menu. */
export function AdminNav({ badges }: { badges: Badges }) {
  const path = usePathname();
  return (
    <nav className="hidden flex-col gap-1 px-3 md:flex" aria-label="Admin">
      {ITEMS.map((i) => {
        const active = isActive(path, i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[15px] ${active ? "bg-pista text-white" : "text-ink-soft hover:bg-paper"}`}
          >
            {i.label}
            <Count n={"badge" in i ? badges[i.badge] : 0} active={active} />
          </Link>
        );
      })}
    </nav>
  );
}

const BOTTOM = [
  { href: "/admin/orders", label: "Orders", icon: "M4 6h16M4 12h16M4 18h10", badge: (b: Badges) => b.orders },
  { href: "/admin/products", label: "Products", icon: "M4 7l8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7", badge: () => 0 },
  { href: "/admin", label: "Analytics", icon: "M4 20V10m6 10V4m6 16v-7m4 7H2", badge: () => 0 },
  { href: "/admin/more", label: "More", icon: "M5 12h.01M12 12h.01M19 12h.01", badge: (b: Badges) => b.reviews + b.enquiries + b.checkouts }
];

/** Phones: bottom bar with the four places the owner switches between most. */
export function AdminBottomNav({ badges }: { badges: Badges }) {
  const path = usePathname();
  const moreActive = ["/admin/more", "/admin/checkouts", "/admin/reviews", "/admin/enquiries", "/admin/coupons", "/admin/settings"].some((h) => path.startsWith(h));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-paper-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Admin">
      {BOTTOM.map((i) => {
        const active = i.href === "/admin/more" ? moreActive : isActive(path, i.href) && !(i.href === "/admin" && moreActive);
        const n = i.badge(badges);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-semibold ${active ? "text-pista" : "text-ink-soft"}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={i.label === "More" ? 3.5 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={i.icon} />
            </svg>
            {i.label}
            {n ? (
              <span className="rate-num absolute right-[calc(50%-22px)] top-1.5 rounded-full bg-khata px-1.5 text-[11px] leading-4 text-white" aria-label={`${n} need attention`}>
                {n}
              </span>
            ) : null}
            {active ? <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-pista" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
