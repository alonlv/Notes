import { defineConfig, devices } from "@playwright/test";
import { TEST_AUTH_SECRET } from "./e2e/fixtures";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// The E2E suite is hermetic — the backend is stubbed at the network layer (see
// e2e/fixtures.ts), so BACKEND_URL/APP_API_TOKEN only need to be present
// (proxy.ts throws if they are missing), not point at a live service.

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    // Mirror the deployed standalone server (next.config.ts sets output: "standalone"),
    // copying static assets in the same way the Dockerfile/nixpacks build does.
    command:
      "npm run build && cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/ && HOSTNAME=0.0.0.0 node .next/standalone/server.js",
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      AUTH_SECRET: TEST_AUTH_SECRET,
      // Google credentials only need to be present for Auth.js to configure the
      // provider; the suite seeds a session cookie instead of signing in.
      AUTH_GOOGLE_ID: "test-google-client-id",
      AUTH_GOOGLE_SECRET: "test-google-client-secret",
      AUTH_TRUST_HOST: "true",
      BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:9999",
      APP_API_TOKEN: process.env.APP_API_TOKEN ?? "test-api-token",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
