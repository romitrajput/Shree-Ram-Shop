import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EnvBanner } from "@/components/EnvBanner";
import { PageTracker } from "@/components/PageTracker";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { getSettings } from "@/lib/settings";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <CartProvider>
      <EnvBanner />
      <Header />
      <PageTracker />
      <main>{children}</main>
      <Footer settings={settings} />
      <WhatsAppButton number={settings.whatsappNumber} />
    </CartProvider>
  );
}
