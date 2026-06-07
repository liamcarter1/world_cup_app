import { prisma } from "@/lib/db";
import { getSnapshotSafe } from "@/lib/providers";
import { deriveTeamStates, type ScoringMatch, type ScoringTeam } from "@/lib/scoring";
import { liveStatus } from "@/lib/theme";
import type { ProviderSnapshot } from "@/lib/types";

export interface SyncResult {
  source: string;
  usedFallback: boolean;
  teams: number;
  matches: number;
  champion: string | null;
  skipped?: boolean;
  reason?: string;
}

// Write the snapshot into the DB and recompute cached scoring projections.
export async function applySnapshot(snapshot: ProviderSnapshot): Promise<SyncResult> {
  // 1) Upsert teams.
  for (const t of snapshot.teams) {
    await prisma.team.upsert({
      where: { externalId: t.externalId },
      create: {
        externalId: t.externalId,
        name: t.name,
        code: t.code,
        flag: t.flag,
        groupName: t.groupName,
      },
      update: { name: t.name, code: t.code, flag: t.flag, groupName: t.groupName },
    });
  }

  const dbTeams = await prisma.team.findMany();
  const idByExternal = new Map(dbTeams.map((t) => [t.externalId, t.id]));

  // 2) Upsert matches, resolving team relations by externalId.
  for (const f of snapshot.fixtures) {
    const homeTeamId = f.homeExternalId ? idByExternal.get(f.homeExternalId) ?? null : null;
    const awayTeamId = f.awayExternalId ? idByExternal.get(f.awayExternalId) ?? null : null;
    const winnerTeamId = f.winnerExternalId
      ? idByExternal.get(f.winnerExternalId) ?? null
      : null;
    const data = {
      round: f.round,
      roundOrd: f.roundOrd,
      groupName: f.groupName,
      kickoff: new Date(f.kickoff),
      venue: f.venue,
      status: f.status,
      homeTeamId,
      awayTeamId,
      homeGoals: f.homeGoals,
      awayGoals: f.awayGoals,
      winnerTeamId,
    };
    await prisma.match.upsert({
      where: { externalId: f.externalId },
      create: { externalId: f.externalId, ...data },
      update: data,
    });
  }

  // 3) Recompute cached team states from the snapshot fixtures.
  const scoringTeams: ScoringTeam[] = snapshot.teams.map((t) => ({
    externalId: t.externalId,
    groupName: t.groupName,
  }));
  const scoringMatches: ScoringMatch[] = snapshot.fixtures.map((f) => ({
    roundOrd: f.roundOrd,
    groupName: f.groupName,
    status: f.status,
    homeExternalId: f.homeExternalId,
    awayExternalId: f.awayExternalId,
    homeGoals: f.homeGoals,
    awayGoals: f.awayGoals,
    winnerExternalId: f.winnerExternalId,
  }));
  const states = deriveTeamStates(scoringTeams, scoringMatches);

  let champion: string | null = null;
  for (const t of snapshot.teams) {
    const s = states.get(t.externalId);
    if (!s) continue;
    if (s.isChampion) champion = t.name;
    await prisma.team.update({
      where: { externalId: t.externalId },
      data: {
        furthestRound: s.furthestRound,
        eliminated: s.eliminated,
        isChampion: s.isChampion,
        goalsFor: s.goalsFor,
      },
    });
  }

  return {
    source: snapshot.source,
    usedFallback: false,
    teams: snapshot.teams.length,
    matches: snapshot.fixtures.length,
    champion,
  };
}

// Stay under the API-Football free tier (100/day): only hit the live API when a match is
// live or kicks off within the next ~20 minutes. Seed/no-key runs are always free.
async function shouldHitLiveApi(): Promise<boolean> {
  if (!process.env.FOOTBALL_API_KEY) return false; // seed source — no budget concern
  const now = Date.now();
  const soon = new Date(now + 20 * 60 * 1000);
  const liveOrSoon = await prisma.match.findFirst({
    where: {
      OR: [
        { status: { in: ["1H", "HT", "2H", "ET", "P", "BT", "SUSP", "INT"] } },
        { status: "NS", kickoff: { lte: soon, gte: new Date(now - 3 * 60 * 60 * 1000) } },
      ],
    },
  });
  return !!liveOrSoon;
}

// Entry point for the cron route.
export async function runSync(opts: { force?: boolean } = {}): Promise<SyncResult> {
  const hasMatches = (await prisma.match.count()) > 0;

  if (process.env.FOOTBALL_API_KEY && hasMatches && !opts.force) {
    if (!(await shouldHitLiveApi())) {
      return {
        source: "skipped",
        usedFallback: false,
        teams: 0,
        matches: 0,
        champion: null,
        skipped: true,
        reason: "No live or imminent matches — preserving API budget.",
      };
    }
  }

  const { snapshot, usedFallback, error } = await getSnapshotSafe();
  const result = await applySnapshot(snapshot);
  result.usedFallback = usedFallback;

  await prisma.syncLog.create({
    data: {
      source: usedFallback ? `${snapshot.source} (fallback)` : snapshot.source,
      ok: true,
      note: error ?? null,
    },
  });

  return result;
}

export function hasLiveMatch(matches: { status: string }[]): boolean {
  return matches.some((m) => liveStatus(m.status));
}
