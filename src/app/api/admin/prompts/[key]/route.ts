import { NextRequest } from "next/server";
import { proxyFetch } from "@/lib/proxy";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return proxyFetch(`/admin/prompts/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: await req.text(),
  });
}

/** Drop the override and go back to the shipped text. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return proxyFetch(`/admin/prompts/${encodeURIComponent(key)}`, { method: "DELETE" });
}
