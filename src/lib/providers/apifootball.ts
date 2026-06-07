import type {
  FootballDataProvider,
  NormalizedFixture,
  NormalizedTeam,
  ProviderSnapshot,
} from "@/lib/types";
import { roundOrdinal } from "./round";
import { teamFlag, teamCode } from "@/data/flags";

const BASE = process.env.FOOTBALL_API_BASE ?? "https://v3.football.api-sports.io";
const LEAGUE = 1; // FIFA World Cup
const SEASON = 2026;

// Map API-Football's team names onto our canonical (openfootball) names so the live
// overlay matches the already-loaded fixtures. Unmapped names fall through unchanged
// (and simply won't match — a safe no-op rather than a duplicate).
const NAME_ALIASES: Record<string, string> = {
  Türkiye: "Turkey",
  Turkiye: "Turkey",
  "Korea Republic": "South Korea",
  Czechia: "Czech Republic",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Congo DR": "DR Congo",
  "DR Congo": "DR Congo",
  "Cabo Verde": "Cape Verde",
  "Cape Verde Islands": "Cape Verde",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "United States": "USA",
  "United States of America": "USA",
};

function canon(name: string | undefined | null): string | null {
  if (!name) return null;
  return NAME_ALIASES[name] ?? name;
}

// API-Football (api-sports.io). Live in-play scores only. One /fixtures call covers
// all 104 matches. Team identity is the canonical country name (for overlay matching).
export class ApiFootballProvider implements FootballDataProvider {
  name = "api-football";
  constructor(private apiKey: string) {}

  private async call(path: string): Promise<any> {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "x-apisports-key": this.apiKey },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`API-Football ${path} -> ${res.status}`);
    const json = await res.json();
    if (json.errors && Object.keys(json.errors).length) {
      throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
    }
    return json;
  }

  async getSnapshot(): Promise<ProviderSnapshot> {
    const fx = await this.call(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
    const teamNames = new Set<string>();

    const fixtures: NormalizedFixture[] = (fx.response ?? []).map((f: any) => {
      const round: string = f.league?.round ?? "Group Stage";
      const home = canon(f.teams?.home?.name);
      const away = canon(f.teams?.away?.name);
      if (home) teamNames.add(home);
      if (away) teamNames.add(away);
      let winner: string | null = null;
      if (f.teams?.home?.winner) winner = home;
      else if (f.teams?.away?.winner) winner = away;
      const hg = f.goals?.home;
      const ag = f.goals?.away;
      return {
        externalId: String(f.fixture?.id ?? `${home}-${away}-${f.fixture?.date}`),
        round,
        roundOrd: roundOrdinal(round),
        groupName: null,
        kickoff: f.fixture?.date ?? new Date().toISOString(),
        venue: f.fixture?.venue?.name ?? null,
        status: f.fixture?.status?.short ?? "NS",
        homeExternalId: home, // canonical country name
        awayExternalId: away,
        homeGoals: typeof hg === "number" ? hg : null,
        awayGoals: typeof ag === "number" ? ag : null,
        winnerExternalId: winner,
      };
    });

    const teams: NormalizedTeam[] = [...teamNames].map((name) => ({
      externalId: name,
      name,
      code: teamCode(name),
      flag: teamFlag(name),
      groupName: "",
    }));

    return { source: this.name, teams, fixtures };
  }
}
