import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

// Called by Vercel Cron (and manually). Rate-budgeted inside runSync so it stays
// under the API-Football free-tier limit. Protected by CRON_SECRET if set.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const url = new URL(request.url);
    const ok = auth === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runSync();
    if (!result.skipped) {
      for (const p of ["/", "/members", "/bracket", "/fixtures", "/admin"]) {
        revalidatePath(p);
      }
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "sync failed" },
      { status: 500 },
    );
  }
}
