import { test, expect, type Page } from "@playwright/test";

// Uses the starter catalogue from prisma/seed-data.ts
const ALMONDS = { name: "California Almonds (Badam)", slug: "california-almonds-badam" };

async function cartCount(page: Page) {
  const label = await page.getByRole("link", { name: /^Cart, \d+/ }).getAttribute("aria-label");
  return Number(label?.match(/\d+/)?.[0] ?? 0);
}

async function fillCheckout(page: Page) {
  await page.getByLabel("Full name").fill("E2E Test Customer");
  await page.getByLabel("Mobile number").fill("9876501234");
  await page.getByLabel("House no., street, area").fill("12 Test Street, Test Nagar");
  await page.getByLabel("PIN code").fill("411001");
  await page.getByLabel("City").fill("Pune");
  await page.getByLabel("State").selectOption("Maharashtra");
}

test.beforeEach(async ({ page }) => {
  // Each test starts with an empty cart
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e-init")) {
      localStorage.removeItem("srt_cart_v1");
      localStorage.removeItem("srt_coupon_v1");
      localStorage.removeItem("srt_pin");
      sessionStorage.setItem("e2e-init", "1");
    }
  });
});

test("home page shows today's rates and products without sideways scrolling", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today's rates" })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(ALMONDS.name.replace(/[()]/g, "\\$&")) }).first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // Rates are whole rupees (no paise like ₹494.10)
  const board = await page.getByRole("heading", { name: "Today's rates" }).locator("xpath=../..").innerText();
  expect(board).not.toMatch(/₹[\d,]+\.\d{2}/);
});

test("search is one tap away in the top bar on phones", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout only");
  await page.goto("/");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("searchbox", { name: "Search dry fruits" })).toBeFocused();
  await page.keyboard.type("badam");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=badam/);
});

test("search finds products by their local name", async ({ page }) => {
  await page.goto("/products?q=kaju");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("kaju");
  await expect(page.getByRole("link", { name: /Cashews W320/ })).toBeVisible();
  await page.goto("/products?q=zzzz-not-a-product");
  await expect(page.getByText("No products match that search.")).toBeVisible();
});

test("quick add from a product card updates the cart", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("button", { name: `Add ${ALMONDS.name} (500 g) to cart` }).click();
  await expect(page.getByRole("link", { name: /1 in cart/ })).toBeVisible();
  expect(await cartCount(page)).toBe(1);
});

test("bulk buying enforces the minimum order quantity", async ({ page }) => {
  await page.goto(`/products/${ALMONDS.slug}`);
  await page.getByRole("button", { name: /Bulk \(\d+\+ packs\)/ }).click();
  const moq = Number((await page.getByRole("button", { name: /Bulk/ }).innerText()).match(/\d+/)![0]);
  await expect(page.getByRole("spinbutton", { name: "Quantity" })).toHaveValue(String(moq));
  await expect(page.getByRole("button", { name: "Decrease quantity" })).toBeDisabled(); // can't go below MOQ
  await page.getByRole("button", { name: /^Add to cart ·/ }).first().click();
  await page.goto("/cart");
  await expect(page.getByText(/Bulk price, min\./)).toBeVisible();
});

test("on phones an add-to-cart bar follows the shopper down the product page", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout only");
  await page.goto(`/products/${ALMONDS.slug}`);
  await expect(page.getByRole("button", { name: "Add to cart", exact: true })).toHaveCount(0);
  await page.mouse.wheel(0, 1500); // a fast fling straight past the main button
  const bar = page.getByRole("button", { name: "Add to cart", exact: true });
  await expect(bar).toBeVisible();
  await bar.click();
  expect(await cartCount(page)).toBe(1);
  await expect(page.getByRole("link", { name: "View cart" })).toBeVisible();
});

test("cart shows how much more is needed for free delivery and updates totals", async ({ page }) => {
  await page.goto(`/products/${ALMONDS.slug}`);
  await page.getByRole("button", { name: /^Add to cart ·/ }).first().click();
  await page.goto("/cart");
  await expect(page.getByText(/more for free delivery/)).toBeVisible();
  const total1 = await page.locator("dd").last().innerText();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await expect(page.locator("dd").last()).not.toHaveText(total1);
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
});

test("checkout explains what's missing and focuses the first problem", async ({ page }) => {
  await page.goto(`/products/${ALMONDS.slug}`);
  await page.getByRole("button", { name: /^Add to cart ·/ }).first().click();
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Place order and pay by UPI" }).click();
  await expect(page.getByText("Enter your full name")).toBeVisible();
  await expect(page.getByText("Enter a 10-digit mobile number")).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeFocused();
  await expect(page.getByLabel("Full name")).toHaveAttribute("aria-invalid", "true");
});

test("customer places an order, pays by UPI and submits the transaction ID", async ({ page, isMobile }) => {
  await page.goto(`/products/${ALMONDS.slug}`);
  await page.getByRole("button", { name: /^Add to cart ·/ }).first().click();
  await page.goto("/checkout");
  await fillCheckout(page);
  await page.getByRole("button", { name: "Place order and pay by UPI" }).click();

  await expect(page).toHaveURL(/\/order\/SRT\d+/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Pay ₹[\d,]+ to confirm your order/);
  if (isMobile) {
    // On a phone the customer can't scan their own screen: the UPI app button comes first
    await expect(page.getByRole("link", { name: /Pay ₹[\d,]+ with a UPI app/ })).toBeVisible();
  } else {
    await expect(page.getByRole("img", { name: /UPI QR code/ })).toBeVisible();
  }
  expect(await cartCount(page)).toBe(0); // cart cleared after ordering

  await page.getByLabel("UPI transaction ID (UTR)").fill("123");
  await page.getByRole("button", { name: "I've paid" }).click();
  await expect(page.getByText(/Enter the 12-digit UPI transaction ID/)).toBeVisible();
  await page.getByLabel("UPI transaction ID (UTR)").fill("431958276099");
  await page.getByRole("button", { name: "I've paid" }).click();
  await expect(page.getByRole("status")).toContainText("We'll match your payment");
});

test("track order rejects a wrong phone number", async ({ page }) => {
  await page.goto("/track");
  await page.getByLabel("Order number").fill("SRT0000000000");
  await page.getByLabel("Mobile number used for the order").fill("9999999999");
  await page.getByRole("button", { name: "Find my order" }).click();
  await expect(page.getByRole("alert")).toContainText("No order matches");
});

test("corporate buyers add several products in bulk from one sheet", async ({ page }) => {
  await page.goto("/corporate");
  await page.getByRole("button", { name: `More packs of ${ALMONDS.name}` }).click();
  await page.getByRole("button", { name: "More packs of Cashews W320 (Kaju)" }).click();
  await expect(page.getByRole("group", { name: `Packs of ${ALMONDS.name}` })).toContainText("50"); // jumps straight to the MOQ
  await page.getByRole("button", { name: `Fewer packs of ${ALMONDS.name}` }).click(); // below MOQ means none
  await expect(page.getByRole("group", { name: `Packs of ${ALMONDS.name}` })).toContainText("0");
  await page.getByRole("button", { name: "Add all to cart" }).click();
  await expect(page.getByRole("status")).toContainText("Added 1 product at bulk prices");
  await page.goto("/cart");
  await expect(page.getByText(/Bulk price, min\. 50/)).toBeVisible();
});

test("corporate page accepts a quote request", async ({ page }) => {
  await page.goto("/corporate");
  await page.getByLabel("Company name").fill("E2E Industries");
  await page.getByLabel("Your name").fill("Test Buyer");
  await page.getByLabel("Mobile number").fill("9812345678");
  await page.getByLabel("What do you need?").fill("200 Diwali boxes with our logo, delivery to Pune.");
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByText("Enquiry received")).toBeVisible();
});

test("every image has a text alternative and every page has one main heading", async ({ page }) => {
  for (const path of ["/", "/products", `/products/${ALMONDS.slug}`, "/corporate", "/track"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }), path).toHaveCount(1);
    const missingAlt = await page.locator("img:not([alt])").count();
    expect(missingAlt, `${path} images without alt`).toBe(0);
    const unnamedButtons = await page.evaluate(() =>
      [...document.querySelectorAll("button")].filter((b) => !(b.getAttribute("aria-label") || b.textContent?.trim())).length
    );
    expect(unnamedButtons, `${path} buttons without a name`).toBe(0);
  }
});

test("home page rate board adds straight to the cart", async ({ page }) => {
  await page.goto("/");
  const board = page.locator("section").filter({ has: page.getByRole("heading", { name: "Today's rates" }) });
  await board.getByRole("button", { name: /^Add California Almonds/ }).click();
  expect(await cartCount(page)).toBe(1);
});

test("review form opens from a button", async ({ page }) => {
  await page.goto(`/products/${ALMONDS.slug}`);
  await expect(page.getByLabel("Your review")).toHaveCount(0);
  await page.getByRole("button", { name: "Write a review" }).click();
  await expect(page.getByLabel("Your review")).toBeVisible();
});

test("PIN-code check tells the shopper when it will arrive and fills the state at checkout", async ({ page }) => {
  await page.goto(`/products/${ALMONDS.slug}`);
  await page.getByLabel("Check delivery to your PIN code").fill("411001");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/Delivers to 411001, Maharashtra in about/)).toBeVisible();
  await page.getByRole("button", { name: /^Add to cart ·/ }).first().click();
  await page.goto("/checkout");
  await expect(page.getByLabel("PIN code")).toHaveValue("411001");
  await expect(page.getByLabel("State")).toHaveValue("Maharashtra");
});

test("an offer code lowers the total and is kept on the order", async ({ page }) => {
  await page.goto(`/products/${ALMONDS.slug}`);
  await page.getByRole("button", { name: /^Add to cart ·/ }).first().click();
  await page.goto("/cart");
  await page.getByLabel("Offer code").fill("NOPE123");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("alert")).toContainText("isn't a valid offer code");
  await page.getByRole("button", { name: /Remove offer code/ }).click();
  await page.getByLabel("Offer code").fill("e2etest5");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(/Offer E2ETEST5/)).toBeVisible();
  await page.goto("/checkout");
  await expect(page.getByText(/Offer E2ETEST5/)).toBeVisible();
  await fillCheckout(page);
  await page.getByRole("button", { name: /^Place order/ }).click();
  await expect(page).toHaveURL(/\/order\/SRT\d+/);
  await expect(page.getByText(/Offer E2ETEST5/)).toBeVisible();
});

test("cash on delivery skips the UPI step", async ({ page }) => {
  await page.goto(`/products/${ALMONDS.slug}`);
  await page.getByRole("button", { name: /^Add to cart ·/ }).first().click();
  await page.goto("/checkout");
  const cod = page.getByRole("radio", { name: /Cash on delivery/ });
  test.skip((await cod.count()) === 0, "Cash on delivery is turned off in settings");
  await fillCheckout(page);
  await cod.check();
  await expect(page.getByText("Cash on delivery fee")).toBeVisible();
  await page.getByRole("button", { name: "Place order (cash on delivery)" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order confirmed");
  await expect(page.getByText(/when your parcel arrives/)).toBeVisible();
});

test("an unfinished checkout shows up for the owner to follow up", async ({ page }) => {
  await page.goto(`/products/${ALMONDS.slug}`);
  await page.getByRole("button", { name: /^Add to cart ·/ }).first().click();
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("Lead Test Shopper");
  await page.getByLabel("Mobile number").fill("9811122233");
  await page.getByLabel("Email (optional)").click(); // leaving the phone field saves the lead
  await page.waitForTimeout(800);
  await page.goto("/admin/checkouts");
  await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL || "owner@shreeramtrading.in");
  await page.getByLabel("Password").fill(process.env.E2E_ADMIN_PASSWORD || "test-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.goto("/admin/checkouts");
  await expect(page.getByText(/Lead Test Shopper/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Message on WhatsApp" }).first()).toBeVisible();
});
