import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyFetch(`/vouchers/${encodeURIComponent(id)}/spend`, {
    method: "POST",
    body: await req.text(),
  });
}
