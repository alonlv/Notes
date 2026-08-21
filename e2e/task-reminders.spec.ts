import { expect, test } from "@playwright/test";
import { authenticate, stubBackend } from "./fixtures";

// A due date is inert — only a reminder reaches the user. These tests cover the bell
// on a task row that raises one, and the chip that shows a task will actually ping.

// Fixed so the all-day → 9am nudge is deterministic wherever the suite runs.
test.use({ timezoneId: "UTC" });

const OWNER = { user_id: "web-user", owner_id: "web-user", authorized_ids: ["web-user"] };

const TASK = {
  ...OWNER,
  id: "task-1",
  title: "Renew passport",
  done: false,
  status: "todo",
  priority: "none",
  tags: [],
  due_date: "2030-06-01T00:00:00+00:00",
  created_at: "2026-01-01T00:00:00+00:00",
  updated_at: "2026-01-01T00:00:00+00:00",
};

const REMINDER = {
  ...OWNER,
  id: "rem-1",
  kind: "reminder",
  platform: "telegram",
  channel_id: "123456",
  content: "Renew passport",
  run_at: "2030-06-01T09:00:00+00:00",
  cron: null,
  last_run_at: null,
  snooze_count: 0,
  awaiting_response: false,
  task_id: "task-1",
};

/** Serve one task plus the given reminders, and capture any automation POST. */
async function seed(page: import("@playwright/test").Page, reminders: object[]) {
  const posted: Record<string, unknown>[] = [];
  await stubBackend(page);
  await page.route("**/api/tasks*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([TASK]) })
  );
  await page.route("**/api/automations*", async (route) => {
    if (route.request().method() === "POST") {
      posted.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, contentType: "application/json", body: '{"id":"rem-new"}' });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(reminders) });
  });
  return posted;
}

test("the bell raises a reminder at the task's due date", async ({ page, context }) => {
  await authenticate(context);
  const posted = await seed(page, []);

  await page.goto("/tasks");
  await expect(page.getByText("Renew passport")).toBeVisible();

  await page.getByTitle("Remind me about this").click();

  await expect.poll(() => posted.length).toBe(1);
  expect(posted[0]).toMatchObject({
    kind: "reminder",
    content: "Renew passport",
    task_id: "task-1",
    // All-day due date, nudged off midnight so it does not ping at 00:00.
    run_at: "2030-06-01T09:00:00.000Z",
  });
});

test("a task with a reminder shows when it will ping", async ({ page, context }) => {
  await authenticate(context);
  await seed(page, [REMINDER]);

  await page.goto("/tasks");

  await expect(page.getByTitle(/^Reminder .* click to remove$/)).toBeVisible();
  await expect(page.getByTitle("Remove reminder")).toBeVisible();
});
