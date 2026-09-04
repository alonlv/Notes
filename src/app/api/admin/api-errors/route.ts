import { proxyFetch } from "@/lib/proxy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  return proxyFetch(`/admin/api-errors${qs ? `?${qs}` : ""}`);
}

export async function DELETE() {
  return proxyFetch("/admin/api-errors", { method: "DELETE" });
}
