import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// TEMPORARY: compare ESPN's events to our DB matches to see why the overlay isn't applying.
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ALIASES: Record<string, string> = {
  Czechia: "Czech Republic",
  "United States": "USA",
  "Türkiye": "Turkey",
  Turkiye: "Turkey",
  "Côte d'Ivoire": "Ivory Coast",
  "Congo DR": "DR Congo",
  "Cabo Verde": "Cape Verde",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Korea Republic": "South Korea",
};
const canon = (n: string) => ALIASES[n] ?? n;
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

export async function GET() {
  const now = Date.now();
  const urls = [
    ESPN,
    `${ESPN}?dates=${ymd(new Date(now - 86400000))}`,
    `${ESPN}?dates=${ymd(new Date(now))}`,
  ];
  const seen = new Set<string>();
  const espn: any[] = [];
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: "no-store", headers: { "User-Agent": "wc" } });
      const j = await r.json();
      for (const e of j.events ?? []) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        const c = e.competitions?.[0];
        const h = c?.competitors?.find((x: any) => x.homeAway === "home");
        const a = c?.competitors?.find((x: any) => x.homeAway === "away");
        espn.push({
          homeRaw: h?.team?.displayName,
          awayRaw: a?.team?.displayName,
          home: canon(h?.team?.displayName),
          away: canon(a?.team?.displayName),
          hs: h?.score,
          as: a?.score,
          state: e.status?.type?.state,
          detail: e.status?.type?.detail,
        });
      }
    } catch (err) {
      espn.push({ error: String(err), url: u });
    }
  }

  // DB teams + matches
  const teams = await prisma.team.findMany();
  const idByName = new Map(teams.map((t) => [t.name, t.id]));
  const nameById = new Map(teams.map((t) => [t.id, t.name]));
  const dbMatches = await prisma.match.findMany();
  const byPair = new Map<string, any>();
  for (const m of dbMatches) {
    if (m.homeTeamId && m.awayTeamId) byPair.set(`${m.homeTeamId}|${m.awayTeamId}`, m);
  }

  // For each live/finished ESPN event, can we match it?
  const matching = espn
    .filter((e) => e.state === "in" || e.state === "post")
    .map((e) => {
      const hId = idByName.get(e.home);
      const aId = idByName.get(e.away);
      const m = hId && aId ? byPair.get(`${hId}|${aId}`) : null;
      return {
        fixture: `${e.home} ${e.hs}-${e.as} ${e.away} (${e.state})`,
        homeInDb: !!hId,
        awayInDb: !!aId,
        matchedDb: !!m,
        dbStatus: m?.status ?? null,
        dbScore: m ? `${m.homeGoals}-${m.awayGoals}` : null,
        reason: !hId ? `home name '${e.home}' not in DB` : !aId ? `away name '${e.away}' not in DB` : !m ? "no DB match with that team pair" : "ok",
      };
    });

  // duplicate team-pairs in DB?
  const pairCount = new Map<string, number>();
  for (const m of dbMatches) {
    if (m.homeTeamId && m.awayTeamId) {
      const k = `${nameById.get(m.homeTeamId)} v ${nameById.get(m.awayTeamId)}`;
      pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
    }
  }
  const dups = [...pairCount.entries()].filter(([, c]) => c > 1).map(([k]) => k);

  return NextResponse.json({
    now: new Date().toISOString(),
    matchCount: dbMatches.length,
    espnLiveOrFinished: espn.filter((e) => e.state !== "pre"),
    matching,
    duplicatePairs: dups,
  });
}
