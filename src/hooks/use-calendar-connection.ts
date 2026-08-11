"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Whether the signed-in person has connected their real Google / Apple calendar. */
export function useCalendarConnection() {
  return useQuery({
    queryKey: ["calendar-connection"],
    queryFn: () => api.calendars.connectionStatus(),
  });
}
