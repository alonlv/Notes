import type { BrowserContext, Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

// Kept in sync with playwright.config.ts webServer.env.
export const TEST_AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-value";
export const TEST_PERSON_ID = "person:alon";

// Auth.js names the session cookie `authjs.session-token` over plain HTTP
// (the `__Secure-` prefix is only used on HTTPS).
const SESSION_COOKIE = "authjs.session-token";

/**
 * Seed a real Auth.js session cookie so protected routes are reachable without
 * a round-trip to Google. The cookie is a genuine signed JWE minted with the
 * same secret the server uses, so the middleware validates it exactly as it
 * would a real sign-in — the test bypasses the identity provider, not the
 * session check.
 */
export async function authenticate(context: BrowserContext): Promise<void> {
  const token = await encode({
    token: { sub: TEST_PERSON_ID, personId: TEST_PERSON_ID, name: "Alon" },
    secret: TEST_AUTH_SECRET,
    salt: SESSION_COOKIE,
    maxAge: 60 * 60,
  });

  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

/**
 * Stub the Next.js API routes that proxy to the FastAPI backend so the E2E
 * suite stays hermetic (no live backend required). Auth and health routes are
 * left untouched because they run entirely in the frontend.
 */
export async function stubBackend(page: Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/api/auth") || url.pathname === "/api/health") {
      return route.fallback();
    }
    // Empty collection is a valid response for every list endpoint the UI calls.
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });
}
