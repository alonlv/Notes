import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// BACKEND_INTERNAL_URL is used for server-to-server calls (Docker/Railway internal network).
// Falls back to BACKEND_URL (public URL) when not set.
const BASE = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_URL;
const TOKEN = process.env.APP_API_TOKEN;

if (!BASE || !TOKEN) {
  throw new Error(
    "Missing required environment variables: BACKEND_URL (or BACKEND_INTERNAL_URL) and APP_API_TOKEN must both be set"
  );
}

/**
 * Forward a request to the backend as the signed-in person.
 *
 * The caller's identity comes from the Auth.js session and is sent as
 * X-Person-Id. It is never read from the incoming request, so a browser cannot
 * ask for another person's data by naming them — which the old `?user_id=`
 * parameter allowed.
 */
export async function proxyFetch(path: string, init?: RequestInit): Promise<NextResponse> {
  const session = await auth();
  if (!session?.personId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = `${BASE!}${path}`;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${TOKEN!}`,
        "Content-Type": "application/json",
        "X-Person-Id": session.personId,
      },
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const text = await res.text();

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed, { status: res.status });
    } catch {
      return new NextResponse(text, { status: res.status });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Backend unreachable:", err);
    return NextResponse.json({ error: "Backend service unavailable." }, { status: 503 });
  }
}
