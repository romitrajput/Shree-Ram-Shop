import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_ADMIN_EMAIL || "owner@shreeramtrading.in";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "test-password";

async function login(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
}

test("admin pages need a login and reject a wrong password", async ({ page }) => {
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert")).toContainText("Email or password is wrong");
});

test("owner sees the analytics dashboard with growth suggestions", async ({ page }) => {
  await login(page);
  for (const label of ["Visitors", "Orders", "Revenue", "Visits that order"]) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
  await page.getByRole("link", { name: /7 days/ }).click();
  await expect(page).toHaveURL(/days=7/);
});

test("product form shows the selling price as MRP and discount change", async ({ page }) => {
  await login(page);
  await page.goto("/admin/products/new");
  await page.getByLabel("MRP (₹)").fill("1000");
  await page.getByLabel("Discount (%)").fill("15");
  await expect(page.getByText("Customers pay")).toContainText("₹850");
  await page.getByText("Sell to corporate customers in bulk").click();
  await expect(page.getByLabel("Minimum order quantity (packs)")).toBeVisible();
});

test("owner confirms a payment the customer submitted", async ({ page }) => {
  await login(page);
  await page.goto("/admin/orders?f=verify");
  const first = page.getByRole("link", { name: /SRT\d+/ }).first();
  test.skip((await first.count()) === 0, "No order is waiting for payment verification");
  await first.click();
  await expect(page.getByText("Check your bank or UPI app for this payment")).toBeVisible();
  await page.getByRole("button", { name: "Payment received – confirm order" }).click();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark packed" })).toBeVisible();
});

test("owner creates a coupon used by the shop tests", async ({ page }) => {
  await login(page);
  await page.goto("/admin/coupons");
  if (await page.getByText("E2ETEST5", { exact: true }).count()) return; // created by an earlier run
  await page.getByLabel("Code").fill("E2ETEST5");
  await page.getByLabel("Percent off").fill("5");
  await page.getByRole("button", { name: "Create coupon" }).click();
  await expect(page.getByText("Coupon created")).toBeVisible();
  await page.reload();
  await expect(page.getByText("E2ETEST5", { exact: true })).toBeVisible();
});

test("owner turns on cash on delivery", async ({ page }) => {
  await login(page);
  await page.goto("/admin/settings");
  await page.getByLabel("Offer cash on delivery").check();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved")).toBeVisible();
});

test("cancelling an order needs a confirmation tick", async ({ page }) => {
  await login(page);
  await page.goto("/admin/orders?f=all");
  await page.getByRole("link", { name: /SRT\d+/ }).first().click();
  const more = page.getByText("More actions");
  test.skip((await more.count()) === 0, "Order can no longer be cancelled");
  await expect(page.getByRole("button", { name: "Cancel order" })).toBeHidden(); // tucked away
  await more.click();
  await page.getByRole("button", { name: "Cancel order" }).click(); // without the tick: nothing happens
  await expect(page.getByRole("checkbox", { name: /Yes, cancel order/ })).toBeVisible();
  await page.getByRole("checkbox", { name: /Yes, cancel order/ }).check();
  await page.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
});

test("phones get a bottom bar; stock saves from the products list", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout only");
  await login(page);
  const bar = page.getByRole("navigation", { name: "Admin" });
  await bar.getByRole("link", { name: /More/ }).click();
  await expect(page.getByRole("link", { name: /Unfinished checkouts/ })).toBeVisible();
  await bar.getByRole("link", { name: /Products/ }).click();
  await page.getByRole("button", { name: "Add stock" }).first().click();
  await expect(page.getByText("Saved").first()).toBeVisible();
});
