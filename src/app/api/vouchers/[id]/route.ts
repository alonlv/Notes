import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyFetch(`/vouchers/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyFetch(`/vouchers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: await req.text(),
  });
}
