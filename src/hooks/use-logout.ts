"use client";

import { useRouter } from "next/navigation";

/** Clear the session cookie and go back to the login page. */
export function useLogout(): () => Promise<void> {
  const router = useRouter();
  return async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
}
