import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, signOut } from "@/lib/auth";
import { EnvBanner } from "@/components/EnvBanner";
import { getAttention } from "@/lib/attention";
import { AdminBottomNav, AdminNav } from "./AdminNav";

export const metadata = { title: "Admin", robots: { index: false } };

async function logout() {
  "use server";
  await signOut();
  redirect("/admin/login");
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const a = await getAttention();
  const badges = { orders: a.toVerify, enquiries: a.newEnquiries, reviews: a.pendingReviews, checkouts: a.unfinishedCheckouts };

  return (
    <div className="min-h-screen bg-[#F4F3EE]">
      <EnvBanner />
      <div className="flex flex-col md:flex-row">
        <aside className="border-b border-paper-line bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-5 py-4 md:py-5">
            <Link href="/admin" className="font-display text-lg font-bold text-pista">
              SRT Admin
            </Link>
            <Link href="/" className="text-sm text-ink-soft underline" target="_blank">
              View shop
            </Link>
          </div>
          <AdminNav badges={badges} />
          <form action={logout} className="hidden p-5 md:block">
            <p className="text-sm text-ink-mute">{admin.email}</p>
            <button className="mt-1 text-sm text-khata underline">Log out</button>
          </form>
        </aside>
        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-8 md:pb-8">{children}</main>
      </div>
      <AdminBottomNav badges={badges} />
    </div>
  );
}
