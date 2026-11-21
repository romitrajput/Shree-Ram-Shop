import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, signOut } from "@/lib/auth";
import { getAttention } from "@/lib/attention";

async function logout() {
  "use server";
  await signOut();
  redirect("/admin/login");
}

/** Phone "More" tab: everything that isn't Orders, Products or Analytics. */
export default async function AdminMore() {
  const admin = await requireAdmin();
  const a = await getAttention();
  const links = [
    { href: "/admin/checkouts", label: "Unfinished checkouts", n: a.unfinishedCheckouts, hint: "Follow up on WhatsApp" },
    { href: "/admin/reviews", label: "Reviews", n: a.pendingReviews, hint: "Approve customer reviews" },
    { href: "/admin/enquiries", label: "Corporate enquiries", n: a.newEnquiries, hint: "Quotes for bulk buyers" },
    { href: "/admin/coupons", label: "Coupons", n: 0, hint: "Offer codes for campaigns" },
    { href: "/admin/settings", label: "Shop settings", n: 0, hint: "UPI, delivery, cash on delivery, contact" }
  ];
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold">More</h1>
      <ul className="mt-6 divide-y divide-paper-line rounded-tile border border-paper-line bg-white">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3">
              <span>
                <span className="block font-semibold">{l.label}</span>
                <span className="block text-sm text-ink-soft">{l.hint}</span>
              </span>
              {l.n ? <span className="rate-num rounded-full bg-marigold px-2.5 text-sm font-semibold leading-6">{l.n}</span> : <span aria-hidden className="text-ink-mute">›</span>}
            </Link>
          </li>
        ))}
      </ul>
      <form action={logout} className="mt-6">
        <p className="text-sm text-ink-mute">Signed in as {admin.email}</p>
        <button className="btn-danger mt-2">Log out</button>
      </form>
    </div>
  );
}
