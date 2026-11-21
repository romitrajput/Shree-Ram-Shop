/** @type {import('next').NextConfig} */
const isTest = process.env.APP_ENV === "test";

const nextConfig = {
  // Netlify builds with its own Next.js adapter; Docker uses the standalone server.
  output: process.env.NETLIFY ? undefined : "standalone",
  poweredByHeader: false,
  // On Netlify, build-time settings from netlify.toml aren't visible to the
  // running functions, so bake these two in.
  env: process.env.NETLIFY ? { STORAGE: process.env.STORAGE || "netlify", APP_ENV: process.env.APP_ENV || "test" } : {},
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb", // product image uploads
      // Needed when the site runs behind a proxy with a different host name,
      // e.g. GitHub Codespaces ("*.app.github.dev").
      allowedOrigins: process.env.SERVER_ACTIONS_ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean)
    }
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
    ];
    // Keep the test environment out of search engines.
    if (isTest) security.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    return [{ source: "/:path*", headers: security }];
  }
};

export default nextConfig;
