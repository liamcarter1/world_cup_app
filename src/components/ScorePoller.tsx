"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// During match windows, trigger a (server-throttled) live sync and refresh the
// server components so scores + the leaderboard stay current. Works on Vercel
// Hobby (no frequent cron): the /api/live endpoint throttles real API calls.
export function ScorePoller({ active, intervalMs = 60000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const tick = async () => {
      try {
        await fetch("/api/live", { cache: "no-store" });
      } catch {
        // ignore network blips
      }
      if (!cancelled) router.refresh();
    };
    tick(); // fire immediately on open, then keep polling
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, intervalMs, router]);
  return null;
}
