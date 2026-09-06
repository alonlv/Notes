import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Gate every page and API route on a signed-in Google session.
 *
 * This replaces the shared-password cookie: previously one secret let any
 * browser in as anyone, and the person acted on was whatever `user_id` the
 * request asked for. Now the session identifies a specific person, and the
 * proxy derives X-Person-Id from it.
 */
export default auth((req) => {
  if (isPublic(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (!req.auth?.personId) {
    // API routes get a 401 they can handle; pages go to the login screen.
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Run on every route except Next.js internals and static public files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-|sw.js).*)",
  ],
};
