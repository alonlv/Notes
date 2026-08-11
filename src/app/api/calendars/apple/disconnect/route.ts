import { proxyFetch } from "@/lib/proxy";

export async function DELETE() {
  return proxyFetch("/calendars/apple/disconnect", { method: "DELETE" });
}
