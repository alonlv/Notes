import { proxyFetch } from "@/lib/proxy";

export async function DELETE() {
  return proxyFetch("/calendars/google/disconnect", { method: "DELETE" });
}
