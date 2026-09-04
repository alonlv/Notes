"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Contact, ContactIdentity } from "@/types/api";

export type { Contact, ContactIdentity };

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: api.contacts.list,
  });
}
