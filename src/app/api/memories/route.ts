import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const topics = req.nextUrl.searchParams.get("topics");
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (topics) params.set("topics", topics);
  const qs = params.toString();
  return proxyFetch(`/memories${qs ? `?${qs}` : ""}`);
}

export async function POST(req: NextRequest) {
  return proxyFetch("/memories", { method: "POST", body: await req.text() });
}
