import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// TEMPORARY: inspect knockout/elimination state + what ESPN exposes for knockout rounds.
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

export async function GET() {
  const teams = await prisma.team.findMany();
  const nameById = new Map(teams.map((t) => [t.id, t.name]));
  const matches = await prisma.match.findMany({ orderBy: { kickoff: "asc" } });

  // Group completeness + standings
  const FIN = new Set(["FT", "AET", "PEN"]);
  const groups: Record<string, any> = {};
  for (const g of [...new Set(teams.map((t) => t.groupName))].sort()) {
    const gms = matches.filter((m) => m.roundOrd === 0 && m.groupName === g);
    const table: Record<string, { p: number; gd: number; gf: number }> = {};
    for (const t of teams.filter((t) => t.groupName === g))
      table[t.name] = { p: 0, gd: 0, gf: 0 };
    for (const m of gms) {
      if (!FIN.has(m.status) || m.homeGoals == null || m.awayGoals == null) continue;
      const h = nameById.get(m.homeTeamId!), a = nameById.get(m.awayTeamId!);
      if (!h || !a) continue;
      table[h].gf += m.homeGoals; table[h].gd += m.homeGoals - m.awayGoals;
      table[a].gf += m.awayGoals; table[a].gd += m.awayGoals - m.homeGoals;
      if (m.homeGoals > m.awayGoals) table[h].p += 3;
      else if (m.awayGoals > m.homeGoals) table[a].p += 3;
      else { table[h].p += 1; table[a].p += 1; }
    }
    groups[g] = {
      complete: gms.length > 0 && gms.every((m) => FIN.has(m.status)),
      played: gms.filter((m) => FIN.has(m.status)).length + "/" + gms.length,
      table: Object.entries(table).sort((x, y) => y[1].p - x[1].p || y[1].gd - x[1].gd).map(([n, v]) => `${n} ${v.p}pts gd${v.gd}`),
    };
  }

  const ko = matches.filter((m) => m.roundOrd >= 1);
  const knockout = {
    total: ko.length,
    withTeams: ko.filter((m) => m.homeTeamId && m.awayTeamId).length,
    sample: ko.slice(0, 6).map((m) => ({
      round: m.round,
      kickoff: m.kickoff,
      home: m.homeTeamId ? nameById.get(m.homeTeamId) : null,
      away: m.awayTeamId ? nameById.get(m.awayTeamId) : null,
      status: m.status,
    })),
  };

  const eliminated = teams.filter((t) => t.eliminated).map((t) => `${t.name} (${t.groupName}) r${t.furthestRound}`);
  const brazil = teams.find((t) => t.name === "Brazil");

  // What does ESPN have for the next ~12 days? Dump round structure of one event.
  const now = Date.now();
  const espnEvents: any[] = [];
  let rawSample: any = null;
  for (let d = -1; d <= 12; d++) {
    try {
      const r = await fetch(`${ESPN}?dates=${ymd(new Date(now + d * 86400000))}`, { cache: "no-store" });
      const j = await r.json();
      for (const e of j.events ?? []) {
        const c = e.competitions?.[0];
        const cs = c?.competitors ?? [];
        espnEvents.push({
          date: e.date,
          round: c?.notes?.[0]?.headline ?? e.season?.type?.name ?? null,
          home: cs.find((x: any) => x.homeAway === "home")?.team?.displayName,
          away: cs.find((x: any) => x.homeAway === "away")?.team?.displayName,
          state: e.status?.type?.state,
        });
        if (!rawSample) rawSample = { keysEvent: Object.keys(e), keysComp: Object.keys(c ?? {}), notes: c?.notes, type: e.season?.type };
      }
    } catch {}
  }

  return NextResponse.json({
    now: new Date().toISOString(),
    matchCount: matches.length,
    brazil: brazil ? { group: brazil.groupName, furthestRound: brazil.furthestRound, eliminated: brazil.eliminated, goalsFor: brazil.goalsFor } : null,
    groups,
    knockout,
    eliminatedCount: eliminated.length,
    eliminated,
    espnEventCount: espnEvents.length,
    espnEvents: espnEvents.slice(0, 30),
    espnRawSample: rawSample,
  });
}
