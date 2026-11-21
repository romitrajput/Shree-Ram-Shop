"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics-client";

/** Sends a page_view on every client-side navigation. */
export function PageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);
  return null;
}

/** Drop into a page to send a one-off event when it mounts (e.g. product_view). */
export function TrackOnMount(props: {
  type: "product_view" | "search" | "begin_checkout";
  productId?: string;
  value?: number;
  query?: string;
  resultCount?: number;
}) {
  const { type, productId, value, query, resultCount } = props;
  useEffect(() => {
    track(type, { productId, value, query, resultCount });
  }, [type, productId, value, query, resultCount]);
  return null;
}
