import type { FootballDataProvider, NormalizedFixture, ProviderSnapshot } from "@/lib/types";

// ESPN's free, no-key scoreboard for the FIFA World Cup. Carries real fixtures, live
// in-play scores and final results. Used purely as a score overlay onto existing matches.
const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

// Map ESPN's team names onto our canonical (openfootball) names where the WORDS differ.
// Punctuation/accent/case/hyphen differences are handled by teamKey() normalization, so
// e.g. "Bosnia-Herzegovina" already matches "Bosnia & Herzegovina" without an entry here.
const ESPN_ALIASES: Record<string, string> = {
  Czechia: "Czech Republic",
  "United States": "USA",
  "Türkiye": "Turkey",
  Turkiye: "Turkey",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Congo DR": "DR Congo",
  "Cabo Verde": "Cape Verde",
  "Korea Republic": "South Korea",
  "IR Iran": "Iran",
};

function canon(name: string | undefined): string | null {
  if (!name) return null;
  return ESPN_ALIASES[name] ?? name;
}

// Normalized key for fuzzy team-name matching: lowercase, strip accents, and reduce any
// run of punctuation/whitespace to a single space. So "Bosnia & Herzegovina",
// "Bosnia-Herzegovina" and "bosnia  herzegovina" all become "bosnia herzegovina".
export function teamKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export class EspnProvider implements FootballDataProvider {
  name = "espn";

  async getSnapshot(): Promise<ProviderSnapshot> {
    const now = Date.now();
    // Yesterday → +10 days: covers live/finished games AND upcoming knockout fixtures, so
    // qualified teams get slotted into their knockout ties ahead of kick-off.
    const urls = [BASE];
    for (let d = -1; d <= 10; d++) urls.push(`${BASE}?dates=${ymd(new Date(now + d * 86400000))}`);

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
        const played = state === "in" || state === "post";
        const detail: string = e.status?.type?.detail ?? "";
        const status =
          state === "post" ? "FT" : state === "in" ? (detail.toLowerCase().includes("half") ? "HT" : "2H") : "NS";

        // Real team names resolve via canon(); placeholders ("Group F 2nd Place", "W101")
        // pass through and simply won't match a real team (left as TBD).
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
          homeGoals: played && !isNaN(hg) ? hg : null,
          awayGoals: played && !isNaN(ag) ? ag : null,
          winnerExternalId: winner,
        });
      }
    }

    return { source: this.name, teams: [], fixtures };
  }
}
