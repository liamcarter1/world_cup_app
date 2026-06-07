import type {
  FootballDataProvider,
  NormalizedFixture,
  NormalizedTeam,
  ProviderSnapshot,
} from "@/lib/types";
import { roundOrdinal } from "./round";

const BASE = process.env.FOOTBALL_API_BASE ?? "https://v3.football.api-sports.io";
const LEAGUE = 1; // FIFA World Cup
const SEASON = 2026;

interface ApiTeam {
  id: number;
  name: string;
  code?: string | null;
  logo?: string | null;
}

// API-Football (api-sports.io). Primary live source. Requires FOOTBALL_API_KEY.
// One /standings + one /fixtures call refreshes the whole tournament.
export class ApiFootballProvider implements FootballDataProvider {
  name = "api-football";
  constructor(private apiKey: string) {}

  private async call(path: string): Promise<any> {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "x-apisports-key": this.apiKey },
      // server-side only; never cached client-side
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
    const teams: NormalizedTeam[] = [];
    const groupByTeamId = new Map<number, string>();

    // Standings give us the group membership for all 48 teams.
    const standings = await this.call(
      `/standings?league=${LEAGUE}&season=${SEASON}`,
    );
    const groups: any[] = standings.response?.[0]?.league?.standings ?? [];
    for (const group of groups) {
      for (const row of group) {
        const t: ApiTeam = row.team;
        const groupName = String(row.group ?? "Group ?").replace(/^Group\s*/i, "Group ");
        groupByTeamId.set(t.id, groupName);
        teams.push({
          externalId: String(t.id),
          name: t.name,
          code: t.code ?? t.name.slice(0, 3).toUpperCase(),
          flag: t.logo ?? "🏳️",
          groupName,
        });
      }
    }

    // Fixtures: all 104 matches in one call.
    const fx = await this.call(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
    const fixtures: NormalizedFixture[] = (fx.response ?? []).map((f: any) => {
      const round: string = f.league?.round ?? "Group Stage";
      const status: string = f.fixture?.status?.short ?? "NS";
      const hg = f.goals?.home;
      const ag = f.goals?.away;
      let winner: string | null = null;
      if (f.teams?.home?.winner) winner = String(f.teams.home.id);
      else if (f.teams?.away?.winner) winner = String(f.teams.away.id);
      return {
        externalId: String(f.fixture.id),
        round,
        roundOrd: roundOrdinal(round),
        groupName: round.toLowerCase().includes("group")
          ? groupByTeamId.get(f.teams?.home?.id) ?? null
          : null,
        kickoff: f.fixture.date,
        venue: f.fixture?.venue?.name
          ? `${f.fixture.venue.name}${f.fixture.venue.city ? ", " + f.fixture.venue.city : ""}`
          : null,
        status,
        homeExternalId: f.teams?.home?.id ? String(f.teams.home.id) : null,
        awayExternalId: f.teams?.away?.id ? String(f.teams.away.id) : null,
        homeGoals: typeof hg === "number" ? hg : null,
        awayGoals: typeof ag === "number" ? ag : null,
        winnerExternalId: winner,
      };
    });

    return { source: this.name, teams, fixtures };
  }
}
