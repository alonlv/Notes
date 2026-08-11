import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get("topic");
  const qs = topic ? `?topic=${encodeURIComponent(topic)}` : "";
  return proxyFetch(`/notes${qs}`);
}

export async function POST(req: NextRequest) {
  return proxyFetch("/notes", { method: "POST", body: await req.text() });
}
