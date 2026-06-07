"use server";

import { revalidatePath } from "next/cache";
import { performDraw } from "@/lib/draw";
import { runSync } from "@/lib/sync";

function revalidateAll() {
  for (const p of ["/", "/members", "/bracket", "/fixtures", "/admin"]) {
    revalidatePath(p);
  }
}

export async function performDrawAction(): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await performDraw();
    revalidateAll();
    return {
      ok: true,
      message: `Draw complete! 8 teams dealt to each family member (seed ${result.seed}).`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Draw failed." };
  }
}

export async function syncScoresAction(password?: string): Promise<{
  ok: boolean;
  message: string;
}> {
  if (process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_PASSWORD) {
    return { ok: false, message: "Incorrect admin password." };
  }
  try {
    const result = await runSync({ force: true });
    revalidateAll();
    return {
      ok: true,
      message: result.skipped
        ? `Skipped: ${result.reason}`
        : `Synced ${result.matches} matches from ${result.source}${
            result.usedFallback ? " (live source failed, used seed fallback)" : ""
          }.`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Sync failed." };
  }
}
