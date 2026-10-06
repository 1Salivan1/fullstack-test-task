import { expect, test, type Page } from "@playwright/test";

/** Logs in through the demo switcher, which is the reviewer's own entry point. */
async function demoLogin(page: Page, email: string) {
  await page.goto("/demo");
  await page.locator(`form:has(input[value="${email}"]) button[type="submit"]`).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("marketplace flows", () => {
  test.beforeEach(async ({ page }) => {
    // Keep the English dictionary for stable selectors.
    await page.context().addCookies([
      { name: "n5_locale", value: "en", url: "http://localhost:3000" },
    ]);
  });

  test("public catalogue filters by sector and keeps the filter in the URL", async ({ page }) => {
    await page.goto("/assets");
    await expect(page.getByRole("heading", { name: "Assets", exact: true })).toBeVisible();

    await page.getByText("Crypto & Digital Assets", { exact: true }).first().click();
    await page.getByRole("button", { name: "Apply" }).click();

    await expect(page).toHaveURL(/sector=Crypto/);
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    // Filters survive a reload because they live in the query string.
    await page.reload();
    await expect(page).toHaveURL(/sector=Crypto/);
    await expect(cards.first()).toBeVisible();
  });

  test("smart search turns a sentence into filters", async ({ page }) => {
    await page.goto("/assets");
    await page
      .getByPlaceholder("e.g. profitable EMI in Lithuania under €2M, full sale")
      .fill("crypto custody in Switzerland under 12M");
    await page.getByRole("button", { name: "Interpret" }).click();

    await expect(page).toHaveURL(/jurisdiction=Switzerland/);
    await expect(page).toHaveURL(/priceMax=12000000/);
  });

  test("seller publishes a listing and it appears in the public catalogue", async ({ page }) => {
    const title = `E2E payments institution ${Date.now()}`;

    await demoLogin(page, "seller@n5deal.demo");
    await page.goto("/seller/assets/new");

    await page.getByLabel("Listing title").fill(title);
    await page
      .getByLabel("One-line summary")
      .fill("Automated test listing with full financials disclosed.");
    await page
      .getByLabel("Full description")
      .fill(
        "Created by the end-to-end test. Payment institution with its own processing stack, ".repeat(4),
      );
    await page.getByLabel("Sector").selectOption("Payments");
    await page.getByLabel("Jurisdiction").selectOption("Estonia");
    await page.getByLabel("Asking price").fill("1500000");
    await page.getByLabel("Revenue (TTM)").fill("900000");
    await page.getByLabel("EBITDA").fill("150000");

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create listing" }).click();

    await expect(page).toHaveURL(/\/seller\/assets\/.+\/edit/);
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();

    // AI listing review runs even without an API key, via the deterministic engine.
    await page.getByRole("button", { name: "Review listing with AI" }).click();
    await expect(page.getByText("Readiness")).toBeVisible();

    await page.goto(`/assets?q=${encodeURIComponent(title)}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // Leave the demo catalogue as we found it.
    await page.goto(`/seller/assets?q=${encodeURIComponent(title)}`);
    await page.locator("article").filter({ hasText: title }).getByRole("button", { name: "Archive" }).click();
    await expect(page.locator("article").filter({ hasText: title }).getByText("Archived")).toBeVisible();
  });

  test("buyer contacts a seller and the message lands in the seller inbox", async ({ page }) => {
    const body = `Automated enquiry ${Date.now()}: please share the audited financials.`;

    await demoLogin(page, "buyer@n5deal.demo");
    await page.goto("/assets?q=Polish%20payment%20institution");
    await page.getByRole("heading", { name: /Polish payment institution/ }).click();

    await page.getByPlaceholder("Write a message…").fill(body);
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await expect(page).toHaveURL(/\/messages\/.+/);
    await expect(page.getByText(body)).toBeVisible();

    await logout(page);
    await demoLogin(page, "seller@n5deal.demo");
    await page.goto("/messages");
    await expect(page.getByText(body)).toBeVisible();
  });

  test("manager suspends a seller and their listings leave the public catalogue", async ({
    page,
  }) => {
    await demoLogin(page, "manager@n5deal.demo");
    await page.goto("/admin/users?q=Helvetia");

    const card = page.locator("div.rounded-xl").filter({ hasText: "Claudia Berger" }).first();
    await card.getByRole("button", { name: "Moderate" }).click();
    await card.getByPlaceholder("Why is this action being taken?").fill("Automated end-to-end test.");
    await card.getByRole("button", { name: "Suspend" }).click();
    await expect(page.getByText("Action applied.")).toBeVisible();

    // Public catalogue must no longer carry their inventory.
    await page.goto("/assets?q=Swiss%20wealth%20management");
    await expect(page.getByText("No assets match these filters")).toBeVisible();

    // The audit log keeps the decision and its reason.
    await page.goto("/admin/moderation");
    await expect(page.getByText("Automated end-to-end test.").first()).toBeVisible();

    // Restore the seeded state so the suite can be re-run.
    await page.goto("/admin/users?q=Helvetia");
    const restored = page.locator("div.rounded-xl").filter({ hasText: "Claudia Berger" }).first();
    await restored.getByRole("button", { name: "Moderate" }).click();
    await restored
      .getByPlaceholder("Why is this action being taken?")
      .fill("Reverting automated end-to-end test.");
    await restored.getByRole("button", { name: "Reinstate" }).click();
    await expect(page.getByText("Action applied.")).toBeVisible();

    await page.goto("/assets?q=Swiss%20wealth%20management");
    await expect(page.getByRole("heading", { name: /Swiss wealth management/ })).toBeVisible();
  });

  test("locale switch translates the catalogue without changing the URL", async ({ page }) => {
    await page.goto("/assets");
    await page.getByRole("button", { name: "UA" }).click();

    await expect(page).toHaveURL(/\/assets/);
    await expect(page.getByRole("heading", { name: "Активи" })).toBeVisible();
  });
});
