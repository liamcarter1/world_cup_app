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

// Min gap between real API hits (protects the free 100/day budget even if many
// family members' browsers poll at once) and a safety cap on daily API calls.
const THROTTLE_MS = 5 * 60 * 1000;
const DAILY_API_CAP = 90;

// Entry point for the cron route, the live poller, and the admin button.
export async function runSync(opts: { force?: boolean } = {}): Promise<SyncResult> {
  const hasMatches = (await prisma.match.count()) > 0;

  // Budget guards apply to the live API only, and never to a forced (admin) sync.
  if (process.env.FOOTBALL_API_KEY && hasMatches && !opts.force) {
    if (!(await shouldHitLiveApi())) {
      return skipped("No live or imminent matches — preserving API budget.");
    }
    const last = await prisma.syncLog.findFirst({ orderBy: { fetchedAt: "desc" } });
    if (last && Date.now() - last.fetchedAt.getTime() < THROTTLE_MS) {
      return skipped("Recently synced — throttled.");
    }
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const today = await prisma.syncLog.count({ where: { fetchedAt: { gte: startOfDay } } });
    if (today >= DAILY_API_CAP) {
      return skipped("Daily API budget reached — try later.");
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

function skipped(reason: string): SyncResult {
  return {
    source: "skipped",
    usedFallback: false,
    teams: 0,
    matches: 0,
    champion: null,
    skipped: true,
    reason,
  };
}

export function hasLiveMatch(matches: { status: string }[]): boolean {
  return matches.some((m) => liveStatus(m.status));
}
