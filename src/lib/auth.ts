import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Google sign-in mapped onto the backend's canonical person registry.
 *
 * The allowlist lives in the backend (GOOGLE_EMAIL_MAP), not here: on sign-in we
 * post the Google account to /contacts/link-google, which decides whether this
 * email may use the app and returns the canonical person id. Keeping one source
 * of truth means the frontend and backend cannot drift out of agreement about
 * who is allowed in.
 *
 * The resolved person id is carried on the JWT, so every proxied API call can
 * send it as X-Person-Id without a second round trip.
 */

const BASE = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_URL;
const TOKEN = process.env.APP_API_TOKEN;

async function linkGoogleAccount(
  sub: string,
  email: string,
  name: string
): Promise<string | null> {
  if (!BASE || !TOKEN) {
    console.error("Cannot link Google account: BACKEND_URL/APP_API_TOKEN are not set");
    return null;
  }
  try {
    const res = await fetch(`${BASE}/contacts/link-google`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sub, email, name }),
    });
    if (!res.ok) {
      // 403 means the email is not on the backend allowlist.
      return null;
    }
    const data = (await res.json()) as { canonical_id?: string };
    return data.canonical_id ?? null;
  } catch (err) {
    console.error("Could not reach the backend to link the Google account:", err);
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      const sub = profile?.sub;
      const email = profile?.email;
      if (!sub || !email) return false;
      // The backend is the authority on who may sign in.
      return (await linkGoogleAccount(sub, email, profile.name ?? "")) !== null;
    },

    async jwt({ token, profile }) {
      // Only runs with a profile on the sign-in request; afterwards the value
      // is already on the token and rides along with the signed session.
      if (profile?.sub && profile?.email) {
        token.personId = await linkGoogleAccount(
          profile.sub,
          profile.email,
          profile.name ?? ""
        );
      }
      return token;
    },

    async session({ session, token }) {
      session.personId = (token.personId as string | null) ?? null;
      return session;
    },
  },
});
