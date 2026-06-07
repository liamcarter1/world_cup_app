// Bundled, no-network seed snapshot = the REAL 2026 World Cup schedule
// (official draw, 48 teams in 12 groups, 104 matches) from openfootball/worldcup.json.
// Group fixtures have real teams; knockout slots are placeholders until results resolve.
import type { ProviderSnapshot } from "@/lib/types";
import worldCup2026 from "./worldcup-2026.json";
import { parseOpenFootball, type OpenFootballData } from "./openfootball-parse";

const SNAPSHOT = parseOpenFootball(worldCup2026 as OpenFootballData, "seed");

export const SEED_TEAMS = SNAPSHOT.teams;
export const SEED_FIXTURES = SNAPSHOT.fixtures;

export function seedSnapshot(): ProviderSnapshot {
  return SNAPSHOT;
}
