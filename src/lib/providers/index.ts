import type { FootballDataProvider, ProviderSnapshot } from "@/lib/types";
import { SeedProvider } from "./seed";
import { ApiFootballProvider } from "./apifootball";

// Select the live data source by environment, with a guaranteed seed fallback.
// Priority: API-Football (if key) -> bundled seed.
export function getProvider(): FootballDataProvider {
  const key = process.env.FOOTBALL_API_KEY;
  if (key && key.trim().length > 0) {
    return new ApiFootballProvider(key.trim());
  }
  return new SeedProvider();
}

// Resilient snapshot: if the live provider throws (network/rate-limit), fall back to seed.
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
    if (provider.name === "seed") throw err;
    const snapshot = await new SeedProvider().getSnapshot();
    return {
      snapshot,
      usedFallback: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
