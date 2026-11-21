import Link from "next/link";
import type { ShopSettings } from "@/lib/settings";

export function Footer({ settings }: { settings: ShopSettings }) {
  return (
    <footer className="mt-24 bg-pista-dark text-white/80">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-bold text-white">Shree Ram Trading Company</p>
          <p className="mt-3 max-w-sm text-[15px]">
            Dry fruit traders supplying families, sweet shops, hotels and corporate offices. Every pack is sorted, weighed and sealed in our own
            godown.
          </p>
          {settings.gstin ? <p className="mt-3 text-sm">GSTIN {settings.gstin}</p> : null}
        </div>
        <div className="space-y-2 text-[15px]">
          <p className="font-semibold text-white">Shop</p>
          <Link className="block hover:text-marigold" href="/products">
            All dry fruits
          </Link>
          <Link className="block hover:text-marigold" href="/corporate">
            Corporate & bulk orders
          </Link>
          <Link className="block hover:text-marigold" href="/track">
            Track your order
          </Link>
        </div>
        <div className="space-y-2 text-[15px]">
          <p className="font-semibold text-white">Contact</p>
          {settings.phone ? <a className="block hover:text-marigold" href={`tel:${settings.phone}`}>{settings.phone}</a> : null}
          {settings.whatsappNumber ? (
            <a className="block hover:text-marigold" href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noreferrer">
              WhatsApp us
            </a>
          ) : null}
          {settings.email ? <a className="block hover:text-marigold" href={`mailto:${settings.email}`}>{settings.email}</a> : null}
          {settings.address ? <p className="text-sm">{settings.address}</p> : null}
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-sm">© {new Date().getFullYear()} Shree Ram Trading Company</div>
    </footer>
  );
}
