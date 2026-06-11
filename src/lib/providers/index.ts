import type { FootballDataProvider, ProviderSnapshot } from "@/lib/types";
import { SeedProvider } from "./seed";
import { OpenFootballProvider } from "./openfootball";
import { EspnProvider } from "./espn";

// STRUCTURAL source (teams, groups, fixtures, who's playing each match): the free,
// name-keyed openfootball feed, falling back to the bundled real snapshot offline.
// This is the single source of truth for the schedule — API-Football is never used
// here, so team/match identity is always stable (no duplication when a key is added).
export function getStructuralProvider(): FootballDataProvider {
  return new OpenFootballProvider();
}

export async function getSnapshotSafe(): Promise<{
  snapshot: ProviderSnapshot;
  usedFallback: boolean;
  error?: string;
}> {
  const provider = getStructuralProvider();
  try {
    const snapshot = await provider.getSnapshot();
    if (!snapshot.teams.length) throw new Error("empty snapshot");
    return { snapshot, usedFallback: false };
  } catch (err) {
    const snapshot = await new SeedProvider().getSnapshot();
    return {
      snapshot,
      usedFallback: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// LIVE-SCORE source (in-play scores + results, overlaid onto existing matches): ESPN's
// free, no-key World Cup scoreboard. Works for everyone with no API key or sign-up.
export function getLiveProvider(): FootballDataProvider {
  return new EspnProvider();
}
