import { expect, test, type Page } from "@playwright/test";
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
    await stubAdmin(page);

    await page.goto("/admin?tab=errors");

    // The dashboard's error banner links straight here; landing on General and
    // then jumping would mean the deep link did not take.
    await expect(page.getByRole("button", { name: "Errors" })).toBeVisible();
    await expect(page.getByText("No API errors recorded")).toBeVisible();
  });

  test("every admin tab renders", async ({ page, context }) => {
    // The panels live in their own modules now; this walks all ten so a bad
    // import or a missing prop shows up as a failing test rather than a blank
    // tab nobody opened.
    await authenticate(context);
    await stubAdmin(page);

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    // Reached by deep link rather than by clicking through the group headers —
    // it is the same setTab, and it does not depend on the nav's shape.
    const tabs: [string, string][] = [
      ["general", "Agent Identity"],
      ["providers", "Add provider"],
      ["contacts", "Add person"],
      ["calendar", "Google Calendar"],
      ["prompt", "Core Behavior"],
      ["memory", "How memory consolidation works"],
      ["data", "Load Data"],
      ["heartbeat", "How heartbeat works"],
      ["background", "LLM Router"],
      ["errors", "No API errors recorded"],
    ];

    for (const [tab, marker] of tabs) {
      await page.goto(`/admin?tab=${tab}`);
      await expect(page.getByText(marker).first()).toBeVisible();
    }

    expect(errors).toEqual([]);
  });
});

/** Admin needs a config object rather than the blanket empty list, or it renders
 *  its load-failed state instead of any tabs. Registered after the blanket stub
 *  so these win — Playwright tries the most recently added route first. */
async function stubAdmin(page: Page): Promise<void> {
  await stubBackend(page);
  await page.route("**/api/admin/config", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      // The prompt fields are part of the real response and the Prompts tab
      // renders their length, so a stub without them is not a fair stand-in.
      body: JSON.stringify({
        effective: {
          agent_name: "Alexander",
          agent_timezone: "Asia/Jerusalem",
          llm_providers: [],
          prompt_core: "core",
          prompt_memory: "memory",
          prompt_proactive: "proactive",
          prompt_notes: "notes",
        },
      }),
    }),
  );
  await page.route("**/api/admin/config/defaults", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/api/admin/contacts", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ contacts: [] }) }),
  );
  await page.route("**/api/admin/background-status", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jobs: {} }) }),
  );
  await page.route("**/api/admin/router-metrics", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: 0, by_target: {}, by_kind: {}, providers: [], recent: [] }),
    }),
  );
  await page.route("**/api/admin/api-errors**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: 0, by_source: {}, latest: null, recent: [] }),
    }),
  );
  await page.route("**/api/calendars/connection-status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ google: false, apple: false, google_configured: true }),
    }),
  );
}
