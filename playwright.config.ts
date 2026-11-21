import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the shop and the owner admin.
 *
 *   npm run test:e2e                         # starts `npm run start` on :3000 (build first)
 *   BASE_URL=https://test.shreeramtrading.in npm run test:e2e   # run against the test environment
 *
 * The database must have the starter catalogue (`npm run db:seed`) and an owner
 * login matching E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
 */
const baseURL = process.env.BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tests share one database (stock, orders)
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run start", url: `${baseURL}/api/health`, reuseExistingServer: true, timeout: 120_000 }
});
