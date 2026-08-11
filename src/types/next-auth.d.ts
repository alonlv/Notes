import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** The backend's canonical person id for the signed-in user (e.g. "person:alon"). */
    personId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    personId?: string | null;
  }
}
