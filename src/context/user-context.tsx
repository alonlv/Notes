"use client";

import { useSession } from "next-auth/react";

/**
 * Who the signed-in person is.
 *
 * This used to be a contact *switcher*: you picked any contact and every request
 * carried their `user_id`, so one browser could read anyone's data. Identity now
 * comes from the signed session and is enforced server-side, so this is
 * read-only — there is nothing to switch to.
 */
export function useCurrentPerson(): { personId: string | null; personName: string | null } {
  const { data: session } = useSession();
  return {
    personId: session?.personId ?? null,
    personName: session?.user?.name ?? null,
  };
}
