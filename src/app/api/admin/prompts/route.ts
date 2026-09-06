import { proxyFetch } from "@/lib/proxy";

/** Every prompt the assistant uses, with its current text and whether it's customized. */
export async function GET() {
  return proxyFetch("/admin/prompts");
}
