import { prisma } from "@/lib/db";
import { getSnapshotSafe, getLiveProvider } from "@/lib/providers";
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

// A match is live now, or kicked off in the last ~3h, or kicks off within ~20 min.
async function inLiveWindow(): Promise<boolean> {
  const now = Date.now();
  const soon = new Date(now + 20 * 60 * 1000);
  const m = await prisma.match.findFirst({
    where: {
      OR: [
        { status: { in: ["1H", "HT", "2H", "ET", "P", "BT", "SUSP", "INT"] } },
        { status: "NS", kickoff: { lte: soon, gte: new Date(now - 3 * 60 * 60 * 1000) } },
      ],
    },
    select: { id: true },
  });
  return !!m;
}

async function shouldHitLiveApi(): Promise<boolean> {
  if (!process.env.FOOTBALL_API_KEY) return false; // no key — overlay not used
  return inLiveWindow();
}

// Min gap between real API hits (protects the free 100/day budget even if many
// family members' browsers poll at once) and a safety cap on daily API calls.
const THROTTLE_MS = 5 * 60 * 1000;
const DAILY_API_CAP = 90;
// Min gap between free-source (openfootball) refreshes triggered by the poller, so
// many phones polling during a match don't hammer the DB. The daily cron is separate.
const STRUCT_THROTTLE_MS = 3 * 60 * 1000;

// Has the free structural source been refreshed within the throttle window?
async function structuralRecentlySynced(): Promise<boolean> {
  const last = await prisma.syncLog.findFirst({
    where: { NOT: { source: { startsWith: "api-football" } } },
    orderBy: { fetchedAt: "desc" },
  });
  return !!last && Date.now() - last.fetchedAt.getTime() < STRUCT_THROTTLE_MS;
}

// Throttle + daily cap, counted only against real API-Football calls.
async function withinApiBudget(): Promise<boolean> {
  const last = await prisma.syncLog.findFirst({
    where: { source: { startsWith: "api-football" } },
    orderBy: { fetchedAt: "desc" },
  });
  if (last && Date.now() - last.fetchedAt.getTime() < THROTTLE_MS) return false;
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const today = await prisma.syncLog.count({
    where: { source: { startsWith: "api-football" }, fetchedAt: { gte: startOfDay } },
  });
  return today < DAILY_API_CAP;
}

// Recompute cached team scoring projections from whatever is currently in the DB.
async function recomputeCachedStates(): Promise<void> {
  const teams = await prisma.team.findMany();
  const externalById = new Map(teams.map((t) => [t.id, t.externalId]));
  const matches = await prisma.match.findMany();
  const scoringMatches: ScoringMatch[] = matches.map((m) => ({
    roundOrd: m.roundOrd,
    groupName: m.groupName,
    status: m.status,
    homeExternalId: m.homeTeamId ? externalById.get(m.homeTeamId) ?? null : null,
    awayExternalId: m.awayTeamId ? externalById.get(m.awayTeamId) ?? null : null,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
    winnerExternalId: m.winnerTeamId ? externalById.get(m.winnerTeamId) ?? null : null,
  }));
  const scoringTeams: ScoringTeam[] = teams.map((t) => ({
    externalId: t.externalId,
    groupName: t.groupName,
  }));
  const states = deriveTeamStates(scoringTeams, scoringMatches);
  for (const t of teams) {
    const s = states.get(t.externalId);
    if (!s) continue;
    await prisma.team.update({
      where: { id: t.id },
      data: {
        furthestRound: s.furthestRound,
        eliminated: s.eliminated,
        isChampion: s.isChampion,
        goalsFor: s.goalsFor,
      },
    });
  }
}

// Overlay live scores from API-Football onto EXISTING matches only. Matches are found
// by canonical team pair, so nothing is ever created — unknown/unresolved games are
// safely skipped. Returns the number of matches updated, or null if unavailable.
async function applyLiveOverlay(): Promise<number | null> {
  const provider = getLiveProvider();
  if (!provider) return null;

  let snapshot: ProviderSnapshot;
  try {
    snapshot = await provider.getSnapshot();
  } catch {
    return null; // network / key / rate-limit issue — fail safe, free source still applies
  }

  const teams = await prisma.team.findMany();
  const idByName = new Map(teams.map((t) => [t.name, t.id]));
  const dbMatches = await prisma.match.findMany();
  const matchByPair = new Map<string, string>();
  for (const m of dbMatches) {
    if (m.homeTeamId && m.awayTeamId) matchByPair.set(`${m.homeTeamId}|${m.awayTeamId}`, m.id);
  }

  let updated = 0;
  for (const f of snapshot.fixtures) {
    if (!f.homeExternalId || !f.awayExternalId) continue;
    const homeId = idByName.get(f.homeExternalId);
    const awayId = idByName.get(f.awayExternalId);
    if (!homeId || !awayId) continue;
    const matchId = matchByPair.get(`${homeId}|${awayId}`);
    if (!matchId) continue;
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: f.status,
        homeGoals: f.homeGoals,
        awayGoals: f.awayGoals,
        winnerTeamId: f.winnerExternalId ? idByName.get(f.winnerExternalId) ?? null : null,
      },
    });
    updated++;
  }

  if (updated > 0) await recomputeCachedStates();
  return updated;
}

// Entry point for the cron route, the live poller, and the admin button.
// - structural refresh (free openfootball feed) keeps fixtures + results current
// - live overlay (API-Football) adds in-play scores, only when a key + match are live
//
// Modes:
//   force  → full refresh now (admin button)
//   poll   → live poller: refresh the free source only during a match window, throttled
//   (none) → daily cron / setup: full structural refresh
export async function runSync(
  opts: { force?: boolean; poll?: boolean } = {},
): Promise<SyncResult> {
  let result: SyncResult = skipped("Nothing to sync.");

  // 1) Structural refresh from the free source (the poller only does this during a
  // live window, and not more often than the throttle, to keep DB writes sane).
  let doStructural = true;
  if (opts.poll && !opts.force) {
    doStructural = (await inLiveWindow()) && !(await structuralRecentlySynced());
  }
  if (doStructural) {
    const { snapshot, usedFallback, error } = await getSnapshotSafe();
    result = await applySnapshot(snapshot);
    result.usedFallback = usedFallback;
    await prisma.syncLog.create({
      data: {
        source: usedFallback ? `${snapshot.source} (fallback)` : snapshot.source,
        ok: true,
        note: error ?? null,
      },
    });
  }

  // 2) Live-score overlay from API-Football (additive, budget-guarded, fail-safe).
  if (process.env.FOOTBALL_API_KEY) {
    const inWindow = opts.force || (await shouldHitLiveApi());
    if (inWindow && (opts.force || (await withinApiBudget()))) {
      const updated = await applyLiveOverlay();
      if (updated != null) {
        await prisma.syncLog.create({
          data: { source: "api-football", ok: true, note: `overlay:${updated}` },
        });
        result = {
          source: "api-football",
          usedFallback: false,
          teams: 0,
          matches: updated,
          champion: null,
        };
      }
    }
  }

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
