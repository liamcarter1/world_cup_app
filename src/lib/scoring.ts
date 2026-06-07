// "Last team standing" scoring — pure functions, no DB/React deps (unit-testable).

export const FINISHED = new Set(["FT", "AET", "PEN"]);

// Cumulative points by furthest round reached (index = roundOrd 0..5).
// Group survival(R32)=3, R16=+3, QF=+4, SF=+6, Final=+8, Champion=+12 on top.
export const ROUND_POINTS = [0, 3, 6, 10, 16, 24];
export const CHAMPION_BONUS = 12;

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

  for (const team of teams) {
    const id = team.externalId;
    const involves = (m: ScoringMatch) =>
      m.homeExternalId === id || m.awayExternalId === id;

    const teamMatches = matches.filter(involves);

    // Furthest round: highest round in which the team actually appears with a real opponent.
    let furthestRound = 0;
    for (const m of teamMatches) {
      if (m.roundOrd === 0 || bothAssigned(m)) {
        furthestRound = Math.max(furthestRound, m.roundOrd);
      }
    }

    const goalsFor = teamMatches.reduce((sum, m) => {
      if (!isFinished(m)) return sum;
      if (m.homeExternalId === id) return sum + (m.homeGoals ?? 0);
      if (m.awayExternalId === id) return sum + (m.awayGoals ?? 0);
      return sum;
    }, 0);

    const isChampion = champion === id;

    // Elimination.
    let eliminated = false;
    if (!isChampion) {
      // Lost a finished knockout match?
      const lostKnockout = teamMatches.some(
        (m) =>
          m.roundOrd >= 1 &&
          bothAssigned(m) &&
          isFinished(m) &&
          matchWinner(m) !== null &&
          matchWinner(m) !== id,
      );
      // Failed to advance from a completed group?
      const groupMatches = matches.filter(
        (m) => m.roundOrd === 0 && m.groupName === team.groupName,
      );
      const groupComplete =
        groupMatches.length > 0 && groupMatches.every(isFinished);
      const reachedKnockout = teamMatches.some(
        (m) => m.roundOrd >= 1 && bothAssigned(m),
      );
      eliminated = lostKnockout || (groupComplete && !reachedKnockout);
    }

    states.set(id, { externalId: id, furthestRound, eliminated, isChampion, goalsFor });
  }

  return states;
}

export function teamPoints(s: Pick<TeamState, "furthestRound" | "isChampion">): number {
  const base = ROUND_POINTS[Math.min(s.furthestRound, ROUND_POINTS.length - 1)];
  return base + (s.isChampion ? CHAMPION_BONUS : 0);
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
