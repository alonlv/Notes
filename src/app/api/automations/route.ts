import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind");
  const qs = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  return proxyFetch(`/automations${qs}`);
}

export async function POST(req: NextRequest) {
  return proxyFetch("/automations", { method: "POST", body: await req.text() });
}
