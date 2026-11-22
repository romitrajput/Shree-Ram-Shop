import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * 1. Test environment: password-protect the whole site (basic auth) so only
 *    the owner/team can see unreleased features.
 * 2. Admin area: require a valid admin session cookie.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;
  if (process.env.APP_ENV === "test" && user && pass && pathname !== "/api/health") {
    const header = req.headers.get("authorization") || "";
    const expected = "Basic " + btoa(`${user}:${pass}`);
    if (header !== expected) {
      return new NextResponse("Test environment – login required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="SRT Test"' }
      });
    }
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("srt_admin")?.value;
    const secret = process.env.AUTH_SECRET;
    let ok = false;
    if (token && secret) {
      try {
        await jwtVerify(token, new TextEncoder().encode(secret));
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      // Plain /admin lands on Orders after login (the daily job); deeper links return to where they were.
      if (pathname !== "/admin") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/uploads).*)"]
};
