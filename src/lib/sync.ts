import { prisma } from "@/lib/db";
import { getSnapshotSafe, getLiveProvider } from "@/lib/providers";
import { teamKey } from "@/lib/providers/espn";
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

  // 2) Upsert matches. On UPDATE only the STRUCTURAL fields (round/teams/kickoff/venue)
  //    are written — the live score fields (status/goals/winner) are owned by the ESPN
  //    overlay and must NOT be reset to "not started" by a schedule refresh.
  for (const f of snapshot.fixtures) {
    const homeTeamId = f.homeExternalId ? idByExternal.get(f.homeExternalId) ?? null : null;
    const awayTeamId = f.awayExternalId ? idByExternal.get(f.awayExternalId) ?? null : null;
    // On UPDATE, never null-out a team the overlay has resolved (knockout slots come from
    // openfootball as placeholders → null; the ESPN overlay fills them).
    const update: Record<string, unknown> = {
      round: f.round,
      roundOrd: f.roundOrd,
      groupName: f.groupName,
      kickoff: new Date(f.kickoff),
      venue: f.venue,
    };
    if (homeTeamId) update.homeTeamId = homeTeamId;
    if (awayTeamId) update.awayTeamId = awayTeamId;
    await prisma.match.upsert({
      where: { externalId: f.externalId },
      create: {
        externalId: f.externalId,
        round: f.round,
        roundOrd: f.roundOrd,
        groupName: f.groupName,
        kickoff: new Date(f.kickoff),
        venue: f.venue,
        homeTeamId,
        awayTeamId,
        status: f.status,
        homeGoals: f.homeGoals,
        awayGoals: f.awayGoals,
        winnerTeamId: f.winnerExternalId ? idByExternal.get(f.winnerExternalId) ?? null : null,
      },
      update,
    });
  }

  // Prune any stale matches no longer in the source (e.g. if the schedule file's IDs
  // shift), so duplicates can't accumulate. Guarded so a bad/partial snapshot (the WC has
  // 104 matches) can never wipe the table.
  if (snapshot.fixtures.length >= 100) {
    const ids = snapshot.fixtures.map((f) => f.externalId);
    await prisma.match.deleteMany({ where: { externalId: { notIn: ids } } });
  }

  // 3) Recompute cached scoring from the DB (which holds the live results).
  await recomputeCachedStates();
  const champ = await prisma.team.findFirst({ where: { isChampion: true } });

  return {
    source: snapshot.source,
    usedFallback: false,
    teams: snapshot.teams.length,
    matches: snapshot.fixtures.length,
    champion: champ?.name ?? null,
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

// Min gap between openfootball schedule refreshes (poller) and ESPN overlay fetches, so
// many phones polling at once don't hammer the sources. ESPN is free + unlimited, so the
// overlay can refresh close to live.
const STRUCT_THROTTLE_MS = 3 * 60 * 1000;
const OVERLAY_THROTTLE_MS = 60 * 1000;

// Schedule (openfootball/seed) syncs log a non-"espn" source; the overlay logs "espn".
async function structuralRecentlySynced(): Promise<boolean> {
  const last = await prisma.syncLog.findFirst({
    where: { NOT: { source: "espn" } },
    orderBy: { fetchedAt: "desc" },
  });
  return !!last && Date.now() - last.fetchedAt.getTime() < STRUCT_THROTTLE_MS;
}

async function overlayRecentlySynced(): Promise<boolean> {
  const last = await prisma.syncLog.findFirst({
    where: { source: "espn" },
    orderBy: { fetchedAt: "desc" },
  });
  return !!last && Date.now() - last.fetchedAt.getTime() < OVERLAY_THROTTLE_MS;
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

// Overlay live scores + results from ESPN onto EXISTING matches only, matched by canonical
// team pair, so nothing is ever created — unknown/unresolved games are safely skipped.
// Only writes matches whose score/status actually changed. Returns the number of matches
// updated, or null if the source was unavailable.
async function applyLiveOverlay(): Promise<number | null> {
  let snapshot: ProviderSnapshot;
  try {
    snapshot = await getLiveProvider().getSnapshot();
  } catch {
    return null; // network issue — fail safe, schedule still applies
  }

  const teams = await prisma.team.findMany();
  // Match by NORMALIZED team name so spelling/punctuation/accent differences between ESPN
  // and our schedule source don't silently drop a result.
  const idByKey = new Map(teams.map((t) => [teamKey(t.name), t.id]));
  const dbMatches = await prisma.match.findMany();

  const byPair = new Map<string, (typeof dbMatches)[number]>();
  const koByMinute = new Map<string, (typeof dbMatches)[number][]>();
  for (const m of dbMatches) {
    if (m.homeTeamId && m.awayTeamId) byPair.set(`${m.homeTeamId}|${m.awayTeamId}`, m);
    if (m.roundOrd >= 1) {
      const k = minuteKey(m.kickoff);
      if (!koByMinute.has(k)) koByMinute.set(k, []);
      koByMinute.get(k)!.push(m);
    }
  }

  // Resolve each ESPN fixture's team ids, then process fully-resolved fixtures first so the
  // exact team-pair match wins before we fall back to slotting partial knockout ties by time.
  const resolved = snapshot.fixtures.map((f) => ({
    f,
    hId: f.homeExternalId ? idByKey.get(teamKey(f.homeExternalId)) ?? null : null,
    aId: f.awayExternalId ? idByKey.get(teamKey(f.awayExternalId)) ?? null : null,
  }));
  resolved.sort(
    (x, y) => Number(!!y.hId) + Number(!!y.aId) - (Number(!!x.hId) + Number(!!x.aId)),
  );

  const used = new Set<string>();
  let updated = 0;
  for (const { f, hId, aId } of resolved) {
    let match: (typeof dbMatches)[number] | undefined;
    if (hId && aId) match = byPair.get(`${hId}|${aId}`);
    if (!match) {
      // Knockout slot: match by kick-off time (one or both teams may still be TBD).
      match = (koByMinute.get(minuteKey(f.kickoff)) ?? []).find((m) => !used.has(m.id));
    }
    if (!match || used.has(match.id)) continue;
    used.add(match.id);

    const winnerTeamId = f.winnerExternalId ? idByKey.get(teamKey(f.winnerExternalId)) ?? null : null;
    const data: Record<string, unknown> = {};
    if (hId && match.homeTeamId !== hId) data.homeTeamId = hId; // only ever set a resolved team
    if (aId && match.awayTeamId !== aId) data.awayTeamId = aId;
    if (match.status !== f.status) data.status = f.status;
    if (match.homeGoals !== f.homeGoals) data.homeGoals = f.homeGoals;
    if (match.awayGoals !== f.awayGoals) data.awayGoals = f.awayGoals;
    if (match.winnerTeamId !== winnerTeamId) data.winnerTeamId = winnerTeamId;
    if (Object.keys(data).length === 0) continue;

    await prisma.match.update({ where: { id: match.id }, data });
    updated++;
  }

  if (updated > 0) await recomputeCachedStates();
  return updated;
}

function minuteKey(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
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

  // 2) Live-score + results overlay from ESPN (free, no key) — additive, throttled,
  // fail-safe. Always runs (throttled to ~60s) so any missed result self-heals next time.
  if (opts.force || !(await overlayRecentlySynced())) {
    const updated = await applyLiveOverlay();
    if (updated != null) {
      await prisma.syncLog.create({
        data: { source: "espn", ok: true, note: `overlay:${updated}` },
      });
      if (updated > 0) {
        result = {
          source: "espn",
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
