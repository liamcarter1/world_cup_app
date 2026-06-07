// Parses the openfootball worldcup.json shape into our normalized provider snapshot.
// Used by both the live OpenFootball provider and the bundled (offline) seed.
import type { NormalizedFixture, NormalizedTeam, ProviderSnapshot } from "@/lib/types";
import { roundOrdinal } from "@/lib/providers/round";
import { teamFlag, teamCode } from "./flags";

interface RawMatch {
  round: string;
  num?: number;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
  score1?: number;
  score2?: number;
}

export interface OpenFootballData {
  name?: string;
  matches: RawMatch[];
}

// Knockout slots are positional placeholders (e.g. "2A", "1E", "3A/B/C/D/F", "W101")
// until results resolve them — anything containing a digit or slash is not a real team.
function isRealTeam(name: string | undefined): name is string {
  return !!name && !/[0-9/]/.test(name);
}

// "13:00 UTC-6" + "2026-06-11" -> ISO UTC timestamp.
function parseKickoff(date: string, time?: string): string {
  if (!time) return new Date(`${date}T18:00:00Z`).toISOString();
  const [hm, tz] = time.trim().split(/\s+/);
  const [hh, mm] = hm.split(":").map(Number);
  const offMatch = tz?.match(/UTC([+-]\d+)/);
  const off = offMatch ? parseInt(offMatch[1], 10) : 0;
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, hh - off, mm)).toISOString();
}

export function parseOpenFootball(data: OpenFootballData, source = "openfootball"): ProviderSnapshot {
  const matches = data.matches ?? [];

  // Teams come from the group-stage fixtures (real names + their group).
  const teamGroup = new Map<string, string>();
  for (const m of matches) {
    if (!m.group) continue;
    if (isRealTeam(m.team1)) teamGroup.set(m.team1, m.group);
    if (isRealTeam(m.team2)) teamGroup.set(m.team2, m.group);
  }
  const teams: NormalizedTeam[] = [...teamGroup.entries()].map(([name, group]) => ({
    externalId: name,
    name,
    code: teamCode(name),
    flag: teamFlag(name),
    groupName: group,
  }));

  const fixtures: NormalizedFixture[] = matches.map((m, i) => {
    const real1 = isRealTeam(m.team1);
    const real2 = isRealTeam(m.team2);
    const played = typeof m.score1 === "number" && typeof m.score2 === "number";
    const isGroup = m.round.startsWith("Matchday") || !!m.group;
    const externalId =
      m.num != null ? `OF-N${m.num}` : `OF-G-${m.group ?? "?"}-${m.team1}-${m.team2}-${i}`;
    return {
      externalId,
      round: isGroup ? "Group Stage" : m.round,
      roundOrd: isGroup ? 0 : roundOrdinal(m.round),
      groupName: m.group ?? null,
      kickoff: parseKickoff(m.date, m.time),
      venue: m.ground ?? null,
      status: played ? "FT" : "NS",
      homeExternalId: real1 ? m.team1 : null,
      awayExternalId: real2 ? m.team2 : null,
      homeGoals: played ? m.score1! : null,
      awayGoals: played ? m.score2! : null,
      winnerExternalId:
        played && m.score1! !== m.score2! ? (m.score1! > m.score2! ? m.team1 : m.team2) : null,
    };
  });

  return { source, teams, fixtures };
}
