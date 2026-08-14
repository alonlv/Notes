import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function POST(req: NextRequest) {
  return proxyFetch("/vouchers/rules/test", { method: "POST", body: await req.text() });
}
