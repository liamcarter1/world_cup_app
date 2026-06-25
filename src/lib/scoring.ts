// "Last team standing" scoring — pure functions, no DB/React deps (unit-testable).

export const FINISHED = new Set(["FT", "AET", "PEN"]);

// Cumulative points by furthest round reached (index = roundOrd 0..5).
// Group survival(R32)=3, R16=+3, QF=+4, SF=+6, Final=+8, Champion=+12 on top.
export const ROUND_POINTS = [0, 3, 6, 10, 16, 24];
export const CHAMPION_BONUS = 12;
// Each goal a team scores adds to its owner's total — keeps the prize race alive.
export const GOAL_POINTS = 1;

export interface ScoringTeam {
  externalId: string;
  groupName: string;
}

export interface ScoringMatch {
  roundOrd: number;
  groupName: string | null;
  status: string;
  homeExternalId: string | null;
  awayExternalId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  winnerExternalId: string | null;
}

export interface TeamState {
  externalId: string;
  furthestRound: number;
  eliminated: boolean;
  isChampion: boolean;
  goalsFor: number;
}

function isFinished(m: ScoringMatch): boolean {
  return FINISHED.has(m.status);
}

function bothAssigned(m: ScoringMatch): boolean {
  return !!m.homeExternalId && !!m.awayExternalId;
}

function matchWinner(m: ScoringMatch): string | null {
  if (m.winnerExternalId) return m.winnerExternalId;
  if (m.homeGoals == null || m.awayGoals == null) return null;
  if (m.homeGoals > m.awayGoals) return m.homeExternalId;
  if (m.awayGoals > m.homeGoals) return m.awayExternalId;
  return null; // level with no recorded winner (e.g. pens unknown)
}

// Final group-stage position (1..4) for each team whose group is complete.
function computeGroupPositions(
  teams: ScoringTeam[],
  matches: ScoringMatch[],
): Map<string, number> {
  const positions = new Map<string, number>();
  const byGroup = new Map<string, string[]>();
  for (const t of teams) {
    if (!byGroup.has(t.groupName)) byGroup.set(t.groupName, []);
    byGroup.get(t.groupName)!.push(t.externalId);
  }
  for (const [group, ids] of byGroup) {
    const gms = matches.filter((m) => m.roundOrd === 0 && m.groupName === group);
    if (!gms.length || !gms.every(isFinished)) continue; // group not finished yet
    const stat = new Map(ids.map((id) => [id, { p: 0, gd: 0, gf: 0 }]));
    for (const m of gms) {
      if (m.homeGoals == null || m.awayGoals == null) continue;
      const h = m.homeExternalId, a = m.awayExternalId;
      if (!h || !a || !stat.has(h) || !stat.has(a)) continue;
      const sh = stat.get(h)!, sa = stat.get(a)!;
      sh.gf += m.homeGoals; sh.gd += m.homeGoals - m.awayGoals;
      sa.gf += m.awayGoals; sa.gd += m.awayGoals - m.homeGoals;
      if (m.homeGoals > m.awayGoals) sh.p += 3;
      else if (m.awayGoals > m.homeGoals) sa.p += 3;
      else { sh.p += 1; sa.p += 1; }
    }
    const ranked = [...ids].sort((x, y) => {
      const sx = stat.get(x)!, sy = stat.get(y)!;
      return sy.p - sx.p || sy.gd - sx.gd || sy.gf - sx.gf || x.localeCompare(y);
    });
    ranked.forEach((id, i) => positions.set(id, i + 1));
  }
  return positions;
}

// Derive each team's furthest round, elimination + champion flags, and goals scored.
export function deriveTeamStates(
  teams: ScoringTeam[],
  matches: ScoringMatch[],
): Map<string, TeamState> {
  const states = new Map<string, TeamState>();

  // The Final is roundOrd 5 (not the third-place play-off, which is ord 4).
  const finalMatch = matches.find(
    (m) => m.roundOrd === 5 && isFinished(m) && matchWinner(m),
  );
  const champion = finalMatch ? matchWinner(finalMatch) : null;

  const positions = computeGroupPositions(teams, matches);
  const allGroupsComplete = [...new Set(teams.map((t) => t.groupName))].every((g) => {
    const gms = matches.filter((m) => m.roundOrd === 0 && m.groupName === g);
    return gms.length > 0 && gms.every(isFinished);
  });

  for (const team of teams) {
    const id = team.externalId;
    const teamMatches = matches.filter(
      (m) => m.homeExternalId === id || m.awayExternalId === id,
    );

    // Furthest round = the highest round the team appears in. Being slotted into a
    // knockout tie counts even if the opponent slot is still "to be decided".
    let furthestRound = 0;
    for (const m of teamMatches) furthestRound = Math.max(furthestRound, m.roundOrd);

    // Goals count as they happen (live + finished), matching the on-screen score.
    const goalsFor = teamMatches.reduce((sum, m) => {
      if (m.homeExternalId === id) return sum + (m.homeGoals ?? 0);
      if (m.awayExternalId === id) return sum + (m.awayGoals ?? 0);
      return sum;
    }, 0);

    const isChampion = champion === id;

    let eliminated = false;
    if (!isChampion) {
      const lostKnockout = teamMatches.some(
        (m) =>
          m.roundOrd >= 1 &&
          isFinished(m) &&
          bothAssigned(m) &&
          matchWinner(m) !== null &&
          matchWinner(m) !== id,
      );
      const groupMatches = matches.filter(
        (m) => m.roundOrd === 0 && m.groupName === team.groupName,
      );
      const groupComplete = groupMatches.length > 0 && groupMatches.every(isFinished);
      const reachedKnockout = teamMatches.some((m) => m.roundOrd >= 1);
      const pos = positions.get(id); // 1..4 once the group is finished
      eliminated =
        lostKnockout ||
        (groupComplete && pos === 4) || // 4th place never qualifies
        (allGroupsComplete && groupComplete && !reachedKnockout); // missed the best-thirds cut
    }

    states.set(id, { externalId: id, furthestRound, eliminated, isChampion, goalsFor });
  }

  return states;
}

export function teamPoints(s: {
  furthestRound: number;
  isChampion: boolean;
  goalsFor?: number;
}): number {
  const base = ROUND_POINTS[Math.min(s.furthestRound, ROUND_POINTS.length - 1)];
  return base + (s.isChampion ? CHAMPION_BONUS : 0) + (s.goalsFor ?? 0) * GOAL_POINTS;
}

export interface LeaderboardTeam extends TeamState {
  name: string;
  flag: string;
  points: number;
}

export interface LeaderboardEntry {
  memberId: string;
  memberName: string;
  accentColor: string;
  points: number;
  teamsAlive: number;
  highestRound: number;
  goalsFor: number;
  hasChampion: boolean;
  teams: LeaderboardTeam[];
  rank: number;
}

export interface MemberWithTeams {
  id: string;
  name: string;
  accentColor: string;
  teams: { externalId: string; name: string; flag: string }[];
}

// Build the ranked leaderboard from members + derived team states.
export function buildLeaderboard(
  members: MemberWithTeams[],
  states: Map<string, TeamState>,
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = members.map((m) => {
    const teams: LeaderboardTeam[] = m.teams.map((t) => {
      const s =
        states.get(t.externalId) ??
        ({
          externalId: t.externalId,
          furthestRound: 0,
          eliminated: false,
          isChampion: false,
          goalsFor: 0,
        } as TeamState);
      return { ...s, name: t.name, flag: t.flag, points: teamPoints(s) };
    });

    return {
      memberId: m.id,
      memberName: m.name,
      accentColor: m.accentColor,
      points: teams.reduce((sum, t) => sum + t.points, 0),
      teamsAlive: teams.filter((t) => !t.eliminated).length,
      highestRound: teams.reduce((mx, t) => Math.max(mx, t.furthestRound), 0),
      goalsFor: teams.reduce((sum, t) => sum + t.goalsFor, 0),
      hasChampion: teams.some((t) => t.isChampion),
      teams: teams.sort((a, b) => b.points - a.points || b.furthestRound - a.furthestRound),
      rank: 0,
    };
  });

  entries.sort(
    (a, b) =>
      b.points - a.points ||
      b.teamsAlive - a.teamsAlive ||
      b.highestRound - a.highestRound ||
      b.goalsFor - a.goalsFor ||
      a.memberName.localeCompare(b.memberName),
  );
  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}

// Prize allocation for the £30 split pot.
export interface PrizeAllocation {
  champion: { memberName: string; teamName: string } | null;
  runnerUp: { memberName: string; teamName: string } | null;
  mostGoals: { memberName: string; goals: number } | null;
}

export function allocatePrizes(
  leaderboard: LeaderboardEntry[],
  matches: ScoringMatch[],
  ownerByTeam: Map<string, { memberName: string; teamName: string }>,
): PrizeAllocation {
  const finalMatch = matches.find(
    (m) => m.roundOrd === 5 && FINISHED.has(m.status),
  );
  let champion: PrizeAllocation["champion"] = null;
  let runnerUp: PrizeAllocation["runnerUp"] = null;
  if (finalMatch) {
    const w = matchWinner(finalMatch);
    const loser =
      w === finalMatch.homeExternalId
        ? finalMatch.awayExternalId
        : finalMatch.homeExternalId;
    if (w && ownerByTeam.has(w)) champion = ownerByTeam.get(w)!;
    if (loser && ownerByTeam.has(loser)) runnerUp = ownerByTeam.get(loser)!;
  }

  // Most goals = member whose teams scored the most (engagement prize).
  let mostGoals: PrizeAllocation["mostGoals"] = null;
  const topGoals = [...leaderboard].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  if (topGoals && topGoals.goalsFor > 0) {
    mostGoals = { memberName: topGoals.memberName, goals: topGoals.goalsFor };
  }

  return { champion, runnerUp, mostGoals };
}
