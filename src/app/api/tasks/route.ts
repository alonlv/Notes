import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const tag = req.nextUrl.searchParams.get("tag");
  const qs = tag ? `?tag=${encodeURIComponent(tag)}` : "";
  return proxyFetch(`/tasks${qs}`);
}

export async function POST(req: NextRequest) {
  return proxyFetch("/tasks", { method: "POST", body: await req.text() });
}
