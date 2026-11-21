import { redirect } from "next/navigation";
import { getAdmin, signIn } from "@/lib/auth";
import { recordFailure, tooManyFailures } from "@/lib/rate-limit";
import { EnvBanner } from "@/components/EnvBanner";

export const metadata = { title: "Owner login", robots: { index: false } };

async function login(form: FormData) {
  "use server";
  const next = String(form.get("next") || "/admin");
  const safeNext = next.startsWith("/admin") ? next : "/admin";
  if (await tooManyFailures("login", 8)) redirect("/admin/login?error=locked");
  const ok = await signIn(String(form.get("email") || ""), String(form.get("password") || ""));
  if (!ok) await recordFailure("login", 15 * 60 * 1000);
  redirect(ok ? safeNext : `/admin/login?error=1&next=${encodeURIComponent(safeNext)}`);
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  if (await getAdmin()) redirect("/admin");
  const sp = await searchParams;
  return (
    <div className="min-h-screen bg-paper">
      <EnvBanner />
      <form action={login} className="mx-auto mt-24 max-w-sm space-y-4 rounded-tile border border-paper-line bg-white p-8">
        <h1 className="text-2xl font-bold">Owner login</h1>
        {sp.error ? (
          <p role="alert" className="rounded-lg bg-khata-light px-3 py-2 text-sm text-khata">
            {sp.error === "locked" ? "Too many attempts. Wait 15 minutes and try again." : "Email or password is wrong."}
          </p>
        ) : null}
        <input type="hidden" name="next" value={sp.next ?? "/admin"} />
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="username" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
        </div>
        <button className="btn-primary w-full">Log in</button>
      </form>
    </div>
  );
}
