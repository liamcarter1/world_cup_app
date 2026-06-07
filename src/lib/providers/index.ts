import type { FootballDataProvider, ProviderSnapshot } from "@/lib/types";
import { SeedProvider } from "./seed";
import { ApiFootballProvider } from "./apifootball";
import { OpenFootballProvider } from "./openfootball";

// Select the live data source by environment, with a guaranteed seed fallback.
// Priority: API-Football (live in-play, if key) -> OpenFootball (real schedule, no key).
// Both fall back to the bundled REAL seed snapshot if the network is unavailable.
export function getProvider(): FootballDataProvider {
  const key = process.env.FOOTBALL_API_KEY;
  if (key && key.trim().length > 0) {
    return new ApiFootballProvider(key.trim());
  }
  return new OpenFootballProvider();
}

export async function getSnapshotSafe(): Promise<{
  snapshot: ProviderSnapshot;
  usedFallback: boolean;
  error?: string;
}> {
  const provider = getProvider();
  try {
    const snapshot = await provider.getSnapshot();
    if (!snapshot.teams.length) throw new Error("empty snapshot");
    return { snapshot, usedFallback: false };
  } catch (err) {
    // Network/rate-limit failure -> bundled real schedule so the app still works.
    const snapshot = await new SeedProvider().getSnapshot();
    return {
      snapshot,
      usedFallback: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
