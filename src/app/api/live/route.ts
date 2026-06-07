import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Public, server-throttled live refresh. Called by the in-app poller during match
// windows so scores update on Vercel's Hobby plan (which only allows daily cron).
// runSync() enforces a 5-min throttle + daily cap, so any number of polling phones
// still results in at most ~1 real API call per 5 minutes.
export async function GET() {
  try {
    const result = await runSync();
    if (!result.skipped) {
      for (const p of ["/", "/members", "/bracket", "/fixtures"]) revalidatePath(p);
    }
    return NextResponse.json({ ok: true, updated: !result.skipped, reason: result.reason });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "live sync failed" },
      { status: 500 },
    );
  }
}
