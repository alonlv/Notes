import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function GET() {
  return proxyFetch("/vouchers/rules");
}

export async function POST(req: NextRequest) {
  return proxyFetch("/vouchers/rules", { method: "POST", body: await req.text() });
}
