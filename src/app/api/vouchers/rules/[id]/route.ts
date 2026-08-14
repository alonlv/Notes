import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyFetch(`/vouchers/rules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: await req.text(),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyFetch(`/vouchers/rules/${encodeURIComponent(id)}`, { method: "DELETE" });
}
