import { expect, test } from "@playwright/test";
import { authenticate, stubBackend } from "./fixtures";

test.describe("app shell", () => {
  test("the theme choice survives a reload", async ({ page, context }) => {
    await authenticate(context);
    await stubBackend(page);
    await page.goto("/notes");

    const root = page.locator("html");
    const wasDark = await root.evaluate((el) => el.classList.contains("dark"));

    await page.getByRole("button", { name: wasDark ? "Light mode" : "Dark mode" }).click();
    await expect(root).toHaveClass(wasDark ? /^(?!.*\bdark\b).*$/ : /\bdark\b/);

    // The pre-paint script reads the stored choice, so it is already applied on
    // the very first frame after a reload rather than corrected afterwards.
    await page.reload();
    await expect(root).toHaveClass(wasDark ? /^(?!.*\bdark\b).*$/ : /\bdark\b/);
  });

  test("admin opens on the tab the query string asks for", async ({ page, context }) => {
    await authenticate(context);
    await stubBackend(page);
    // Registered after the blanket stub so these win — Playwright tries the most
    // recently added route first. Admin needs a config object rather than the
    // empty list, or it renders its load-failed state instead of any tabs.
    await page.route("**/api/admin/config", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ effective: {} }) }),
    );
    await page.route("**/api/admin/config/defaults", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );

    await page.goto("/admin?tab=errors");

    // The dashboard's error banner links straight here; landing on General and
    // then jumping would mean the deep link did not take.
    await expect(page.getByRole("button", { name: "Errors" })).toBeVisible();
    await expect(page.getByText("No API errors recorded")).toBeVisible();
  });
});
