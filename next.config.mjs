/** @type {import('next').NextConfig} */
const isTest = process.env.APP_ENV === "test";

const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
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
