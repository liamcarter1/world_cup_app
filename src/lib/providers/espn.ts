import type { FootballDataProvider, NormalizedFixture, ProviderSnapshot } from "@/lib/types";

// ESPN's free, no-key scoreboard for the FIFA World Cup. Carries real fixtures, live
// in-play scores and final results. Used purely as a score overlay onto existing matches.
const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

// Map ESPN's team names onto our canonical (openfootball) names. Unmapped names pass
// through unchanged (and simply won't match — a safe no-op, never a duplicate).
const ESPN_ALIASES: Record<string, string> = {
  Czechia: "Czech Republic",
  "United States": "USA",
  "Türkiye": "Turkey",
  Turkiye: "Turkey",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Congo DR": "DR Congo",
  "Cabo Verde": "Cape Verde",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Korea Republic": "South Korea",
  "IR Iran": "Iran",
};

function canon(name: string | undefined): string | null {
  if (!name) return null;
  return ESPN_ALIASES[name] ?? name;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export class EspnProvider implements FootballDataProvider {
  name = "espn";

  async getSnapshot(): Promise<ProviderSnapshot> {
    const now = Date.now();
    // Cover the UTC boundary (late games show under the adjacent US date).
    const urls = [
      BASE,
      `${BASE}?dates=${ymd(new Date(now - 86400000))}`,
      `${BASE}?dates=${ymd(new Date(now))}`,
      `${BASE}?dates=${ymd(new Date(now + 86400000))}`,
    ];

    const seen = new Set<string>();
    const fixtures: NormalizedFixture[] = [];

    for (const url of urls) {
      let json: any;
      try {
        const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "wc-app" } });
        if (!res.ok) continue;
        json = await res.json();
      } catch {
        continue; // fail safe — other dates / the free schedule still apply
      }
      for (const e of json.events ?? []) {
        if (!e?.id || seen.has(e.id)) continue;
        seen.add(e.id);
        const comp = e.competitions?.[0];
        const cs = comp?.competitors ?? [];
        const h = cs.find((x: any) => x.homeAway === "home");
        const a = cs.find((x: any) => x.homeAway === "away");
        if (!h || !a) continue;

        const state = e.status?.type?.state; // "pre" | "in" | "post"
        if (state !== "in" && state !== "post") continue; // only live/finished games

        const detail: string = e.status?.type?.detail ?? "";
        const status =
          state === "post" ? "FT" : detail.toLowerCase().includes("half") ? "HT" : "2H";

        const home = canon(h.team?.displayName);
        const away = canon(a.team?.displayName);
        const hg = parseInt(h.score, 10);
        const ag = parseInt(a.score, 10);

        let winner: string | null = null;
        if (state === "post") {
          if (h.winner) winner = home;
          else if (a.winner) winner = away;
          else if (!isNaN(hg) && !isNaN(ag) && hg !== ag) winner = hg > ag ? home : away;
        }

        fixtures.push({
          externalId: `espn-${e.id}`,
          round: "",
          roundOrd: 0,
          groupName: null,
          kickoff: e.date ?? new Date().toISOString(),
          venue: null,
          status,
          homeExternalId: home,
          awayExternalId: away,
          homeGoals: isNaN(hg) ? null : hg,
          awayGoals: isNaN(ag) ? null : ag,
          winnerExternalId: winner,
        });
      }
    }

    return { source: this.name, teams: [], fixtures };
  }
}
