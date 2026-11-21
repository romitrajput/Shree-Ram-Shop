import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const ADMIN_COOKIE = "srt_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours
const DUMMY_HASH = bcrypt.hashSync("timing-safe-dummy", 10);

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 24) throw new Error("AUTH_SECRET must be set (24+ characters)");
  return new TextEncoder().encode(s);
}

export type AdminSession = { sub: string; email: string; name: string; role: "OWNER" | "STAFF" };

export async function signIn(email: string, password: string): Promise<boolean> {
  const user = await db.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
  // Compare against a dummy hash when the user is missing so timing doesn't reveal valid emails.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return false;

  const token = await new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE
  });
  return true;
}

export async function signOut() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function getAdmin(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
