"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";

const NAV = [
  { href: "/products", label: "Shop" },
  { href: "/corporate", label: "Corporate & bulk" },
  { href: "/track", label: "Track order" }
];

// Note: don't close the menu in onSubmit — unmounting the form during submit cancels the search.
function SearchForm({ id, inputRef }: { id: string; inputRef?: React.Ref<HTMLInputElement> }) {
  return (
    <form action="/products" role="search" className="relative">
      <label htmlFor={id} className="sr-only">
        Search dry fruits
      </label>
      <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input ref={inputRef} id={id} name="q" type="search" placeholder="Search kaju, badam, anjeer…" className="input !rounded-full !pl-9" />
    </form>
  );
}

export function Header() {
  const { count, ready } = useCart();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [focusSearch, setFocusSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const items = ready ? count : 0;

  // The phone search icon opens the menu with the search box already focused.
  useEffect(() => {
    if (open && focusSearch) {
      searchRef.current?.focus();
      setFocusSearch(false);
    }
  }, [open, focusSearch]);

  return (
    <header className="sticky top-0 z-30 border-b border-paper-line bg-paper/95 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-baseline gap-2" onClick={() => setOpen(false)}>
          <span className="font-body text-xl font-semibold text-khata" lang="hi">
            श्री राम
          </span>
          <span className="font-display text-lg font-bold text-pista">Trading Co.</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname.startsWith(n.href) ? "page" : undefined}
              className={`text-[15px] font-medium hover:text-pista ${pathname.startsWith(n.href) ? "text-pista underline decoration-marigold decoration-2 underline-offset-8" : "text-ink-soft"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="btn-ghost !px-3 lg:hidden"
            aria-label="Search"
            onClick={() => {
              setOpen(true);
              setFocusSearch(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
          <div className="hidden w-56 lg:block">
            <SearchForm id="header-search" />
          </div>
          <Link href="/cart" className="btn-ghost relative !px-3 sm:!px-4" aria-label={`Cart, ${items} ${items === 1 ? "item" : "items"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 7h12l-1 13H7L6 7Z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
            </svg>
            <span className="rate-num">{items}</span>
          </Link>
          <button
            className="btn-ghost !px-3 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} />
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <div id="mobile-menu" className="border-t border-paper-line pb-3 lg:hidden">
          <div className="container-x pt-3">
            <SearchForm id="menu-search" inputRef={searchRef} />
          </div>
          <nav className="mt-1 md:hidden" aria-label="Mobile">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                aria-current={pathname.startsWith(n.href) ? "page" : undefined}
                className="block px-5 py-3 font-medium text-ink"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
