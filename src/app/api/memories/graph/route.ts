import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const params = new URLSearchParams();
  for (const key of ["user_id", "topics", "min_weight"]) {
    const value = req.nextUrl.searchParams.get(key);
    if (value) params.set(key, value);
  }
  return proxyFetch(`/memories/graph?${params.toString()}`);
}
