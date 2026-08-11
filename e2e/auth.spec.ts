import { expect, test } from "@playwright/test";
import { authenticate } from "./fixtures";

test.describe("authentication", () => {
  test("redirects an unauthenticated user to the login page", async ({ page }) => {
    await page.goto("/notes");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "My Workspace" })).toBeVisible();
  });

  test("offers Google as the only way in", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    // The shared-password form is gone: there is nothing to type.
    await expect(page.getByPlaceholder("Password")).toHaveCount(0);
  });

  test("explains a rejected account", async ({ page }) => {
    // Auth.js reports AccessDenied when the backend refuses the email.
    await page.goto("/login?error=AccessDenied");
    await expect(page.getByText(/isn't allowed to use this workspace/)).toBeVisible();
  });

  test("a signed-in session reaches a protected page", async ({ page, context }) => {
    await authenticate(context);
    await page.goto("/notes");
    await expect(page).toHaveURL(/\/notes/);
  });

  test("API routes answer 401 rather than redirecting", async ({ request }) => {
    const res = await request.get("/api/notes");
    expect(res.status()).toBe(401);
  });
});
