import { prisma } from "@/lib/db";
import {
  buildLeaderboard,
  allocatePrizes,
  teamPoints,
  type MemberWithTeams,
  type TeamState,
  type ScoringMatch,
  type LeaderboardEntry,
} from "@/lib/scoring";

// Build a TeamState map directly from the cached Team rows (kept fresh by sync).
async function teamStatesFromDb(): Promise<{
  states: Map<string, TeamState>;
  externalById: Map<string, string>;
}> {
  const teams = await prisma.team.findMany();
  const states = new Map<string, TeamState>();
  const externalById = new Map<string, string>();
  for (const t of teams) {
    externalById.set(t.id, t.externalId);
    states.set(t.externalId, {
      externalId: t.externalId,
      furthestRound: t.furthestRound,
      eliminated: t.eliminated,
      isChampion: t.isChampion,
      goalsFor: t.goalsFor,
    });
  }
  return { states, externalById };
}

export async function getMembersWithTeams(): Promise<MemberWithTeams[]> {
  const members = await prisma.member.findMany({
    orderBy: { sortOrder: "asc" },
    include: { assignments: { include: { team: true } } },
  });
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    accentColor: m.accentColor,
    teams: m.assignments
      .map((a) => ({
        externalId: a.team.externalId,
        name: a.team.name,
        flag: a.team.flag ?? "🏳️",
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const [members, { states }] = await Promise.all([
    getMembersWithTeams(),
    teamStatesFromDb(),
  ]);
  if (!members.some((m) => m.teams.length)) return []; // no draw yet
  return buildLeaderboard(members, states);
}

export async function getPrizes(leaderboard: LeaderboardEntry[]) {
  const [{ externalById }, matches, assignments] = await Promise.all([
    teamStatesFromDb(),
    prisma.match.findMany(),
    prisma.assignment.findMany({ include: { team: true, member: true } }),
  ]);

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

  const ownerByTeam = new Map(
    assignments.map((a) => [
      a.team.externalId,
      { memberName: a.member.name, teamName: a.team.name },
    ]),
  );

  return allocatePrizes(leaderboard, scoringMatches, ownerByTeam);
}

export type FixtureView = Awaited<ReturnType<typeof getFixtures>>[number];

export async function getFixtures(opts: { teamExternalId?: string; limit?: number } = {}) {
  const matches = await prisma.match.findMany({
    orderBy: { kickoff: "asc" },
    include: { homeTeam: true, awayTeam: true },
    where: opts.teamExternalId
      ? {
          OR: [
            { homeTeam: { externalId: opts.teamExternalId } },
            { awayTeam: { externalId: opts.teamExternalId } },
          ],
        }
      : undefined,
    take: opts.limit,
  });
  return matches;
}

// Owner lookup: team externalId -> { memberName, accentColor }.
export async function getOwnerMap(): Promise<
  Map<string, { memberName: string; accentColor: string }>
> {
  const assignments = await prisma.assignment.findMany({
    include: { team: true, member: true },
  });
  return new Map(
    assignments.map((a) => [
      a.team.externalId,
      { memberName: a.member.name, accentColor: a.member.accentColor },
    ]),
  );
}

export async function getDrawStatus() {
  const draw = await prisma.draw.findFirst();
  const teamCount = await prisma.team.count();
  return { draw, ready: teamCount === 48 };
}

export async function getMemberById(id: string) {
  return prisma.member.findUnique({
    where: { id },
    include: { assignments: { include: { team: true } } },
  });
}

export function teamPointsForRound(furthestRound: number, isChampion: boolean) {
  return teamPoints({ furthestRound, isChampion });
}
