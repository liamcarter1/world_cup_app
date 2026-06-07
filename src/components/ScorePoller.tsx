"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// While a match is live, refresh the server components periodically so scores
// and the leaderboard stay current. Hits only the cached page, never the API.
export function ScorePoller({ live, intervalMs = 45000 }: { live: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [live, intervalMs, router]);
  return null;
}
