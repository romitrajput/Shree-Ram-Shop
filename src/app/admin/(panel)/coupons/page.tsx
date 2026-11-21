import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { rupees } from "@/lib/format";
import { toggleCoupon } from "../actions";
import { CouponForm } from "./CouponForm";

export default async function AdminCoupons() {
  await requireAdmin();
  const [coupons, usage] = await Promise.all([
    db.coupon.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] }),
    db.order.groupBy({ by: ["couponCode"], where: { couponCode: { not: null }, status: { not: "CANCELLED" } }, _sum: { total: true, discount: true } })
  ]);
  const now = new Date();

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-3xl font-bold">Coupons</h1>
        <p className="mt-2 text-ink-soft">Customers type the code in their cart. Use one code per campaign to see which one sold.</p>
        {coupons.length === 0 ? (
          <p className="card mt-6 p-6 text-ink-soft">No coupons yet. Create one, for example DIWALI10 for 10% off orders above ₹999.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {coupons.map((c) => {
              const u = usage.find((x) => x.couponCode === c.code);
              const expired = c.expiresAt && c.expiresAt < now;
              return (
                <li key={c.id} className={`card p-4 ${c.active && !expired ? "" : "opacity-60"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p>
                      <strong className="font-display text-lg">{c.code}</strong>{" "}
                      <span className="text-ink-soft">
                        {c.kind === "PERCENT" ? `${c.value}% off` : `${rupees(c.value)} off`}
                        {c.maxDiscount ? `, up to ${rupees(c.maxDiscount)}` : ""}
                        {c.minOrder ? ` · orders above ${rupees(c.minOrder)}` : ""}
                        {c.forCorporate ? " · also on bulk orders" : ""}
                      </span>
                    </p>
                    <form action={toggleCoupon}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="btn-ghost min-h-[44px] !py-2 text-sm">{c.active ? "Turn off" : "Turn on"}</button>
                    </form>
                  </div>
                  <p className="rate-num mt-1 text-sm text-ink-soft">
                    Used {c.usedCount}
                    {c.usageLimit ? ` of ${c.usageLimit}` : ""} times
                    {u?._sum.total ? ` · ${rupees(u._sum.total)} of orders · ${rupees(u._sum.discount ?? 0)} given` : ""}
                    {c.expiresAt ? ` · ${expired ? "expired" : "ends"} ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(c.expiresAt)}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <CouponForm />
    </div>
  );
}
