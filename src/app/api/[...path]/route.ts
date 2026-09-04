import { NextRequest, NextResponse } from "next/server";
import { proxyFetch } from "@/lib/proxy";

/**
 * One proxy for every backend call the app makes.
 *
 * These routes were thirty-odd files that each rebuilt the same three lines:
 * read the params, re-encode them, hand the body to `proxyFetch`. The paths are
 * a mirror of the backend's, so mirroring them once is enough — and a route the
 * backend does not have now fails there, with its own error, instead of needing
 * a file here to say so.
 *
 * Next matches concrete routes before a catch-all, so `/api/auth/*` and
 * `/api/health` still resolve to their own handlers: they run entirely in the
 * frontend and never reach the backend.
 */

/** Backend prefixes the browser is allowed to reach. Everything else is 404. */
const ALLOWED = new Set([
  "admin",
  "automations",
  "calendars",
  "chat",
  "memories",
  "notes",
  "tasks",
  "topics",
  "trigger",
]);

/**
 * The three places the frontend's URL does not match the backend's. Each is a
 * deliberate choice on the frontend side — a flatter path, or a query parameter
 * where the backend wants a path segment — so the translation lives here rather
 * than in a route file of its own.
 */
type Target = { path: string; keepQuery: boolean };

function backendPath(segments: string[], search: URLSearchParams): Target | null {
  const encoded = segments.map(encodeURIComponent);
  const [first, ...rest] = encoded;

  // User data hangs off /admin in the UI but is a top-level backend resource.
  if (first === "admin" && rest[0] === "user-data") {
    return { path: `/${rest.join("/")}`, keepQuery: true };
  }

  // The backend nests the provider: /calendars/google/auth, not /google-auth.
  if (first === "calendars" && rest[0] === "google-auth") {
    return { path: "/calendars/google/auth", keepQuery: true };
  }

  // The backend takes the user in the path; the UI passes it as a query param.
  // The only rewrite that consumes the query rather than passing it along.
  if (first === "trigger" && rest.length === 0) {
    const userId = search.get("user_id");
    return userId ? { path: `/trigger/${encodeURIComponent(userId)}`, keepQuery: false } : null;
  }

  return { path: `/${encoded.join("/")}`, keepQuery: true };
}

async function forward(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path: segments } = await params;
  if (!segments?.length || !ALLOWED.has(segments[0])) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const search = req.nextUrl.searchParams;
  const target = backendPath(segments, search);
  if (!target) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const qs = target.keepQuery ? search.toString() : "";
  const method = req.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await req.text();

  return proxyFetch(`${target.path}${qs ? `?${qs}` : ""}`, { method, body });
}

type Context = { params: Promise<{ path: string[] }> };

export const GET = (req: NextRequest, ctx: Context) => forward(req, ctx.params);
export const POST = (req: NextRequest, ctx: Context) => forward(req, ctx.params);
export const PUT = (req: NextRequest, ctx: Context) => forward(req, ctx.params);
export const PATCH = (req: NextRequest, ctx: Context) => forward(req, ctx.params);
export const DELETE = (req: NextRequest, ctx: Context) => forward(req, ctx.params);
