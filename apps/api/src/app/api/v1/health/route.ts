import { json } from "@/lib/route";

export const dynamic = "force-dynamic";

export function GET() {
  return json({ status: "ok", time: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
