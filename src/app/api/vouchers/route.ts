import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  const includeUsed = req.nextUrl.searchParams.get("include_used");
  const qs = includeUsed === "true" ? "?include_used=true" : "";
  return proxyFetch(`/vouchers${qs}`);
}

export async function POST(req: NextRequest) {
  return proxyFetch("/vouchers", { method: "POST", body: await req.text() });
}
