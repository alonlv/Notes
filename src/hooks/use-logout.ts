"use client";

import { signOut } from "next-auth/react";

/** End the Auth.js session and go back to the login page. */
export function useLogout(): () => Promise<void> {
  return async () => {
    await signOut({ redirectTo: "/login" });
  };
}
