import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

/**
 * Run a heartbeat now. Optional ?user_id= limits it to one contact.
 *
 * This is the real heartbeat path. The admin panel used to fake it by pushing a
 * synthetic event through /trigger, which runs a monitor automation instead —
 * so the button exercised different code from the thing it claimed to test.
 */
export async function POST(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return proxyFetch(`/admin/heartbeat/run${query}`, { method: "POST" });
}
