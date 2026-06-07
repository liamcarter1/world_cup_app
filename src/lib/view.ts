import type { FixtureRowData } from "@/components/FixtureRow";
import type { BracketRound, BracketMatch } from "@/components/BracketTree";

type OwnerMap = Map<string, { memberName: string; accentColor: string }>;

// Prisma Match with included home/away team relations.
interface MatchWithTeams {
  id: string;
  round: string;
  roundOrd: number;
  kickoff: Date;
  venue: string | null;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  winnerTeamId: string | null;
  homeTeam: { id: string; externalId: string; name: string; flag: string | null } | null;
  awayTeam: { id: string; externalId: string; name: string; flag: string | null } | null;
}

export function toFixtureRow(m: MatchWithTeams, owners: OwnerMap): FixtureRowData {
  return {
    id: m.id,
    round: m.round,
    kickoff: m.kickoff,
    venue: m.venue,
    status: m.status,
    homeName: m.homeTeam?.name ?? null,
    homeFlag: m.homeTeam?.flag ?? null,
    awayName: m.awayTeam?.name ?? null,
    awayFlag: m.awayTeam?.flag ?? null,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
    homeOwner: m.homeTeam ? owners.get(m.homeTeam.externalId) : undefined,
    awayOwner: m.awayTeam ? owners.get(m.awayTeam.externalId) : undefined,
  };
}

export function buildBracket(matches: MatchWithTeams[], owners: OwnerMap): BracketRound[] {
  const ords = [1, 2, 3, 4, 5];
  return ords.map((ord) => {
    const roundMatches: BracketMatch[] = matches
      .filter((m) => m.roundOrd === ord && !m.round.toLowerCase().includes("third"))
      .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())
      .map((m) => {
        const played = ["FT", "AET", "PEN"].includes(m.status);
        const homeWin = m.winnerTeamId && m.homeTeam?.id === m.winnerTeamId;
        const awayWin = m.winnerTeamId && m.awayTeam?.id === m.winnerTeamId;
        return {
          id: m.id,
          played,
          homeGoals: m.homeGoals,
          awayGoals: m.awayGoals,
          home: {
            name: m.homeTeam?.name ?? null,
            flag: m.homeTeam?.flag ?? null,
            owner: m.homeTeam ? owners.get(m.homeTeam.externalId) : undefined,
            isWinner: !!homeWin,
          },
          away: {
            name: m.awayTeam?.name ?? null,
            flag: m.awayTeam?.flag ?? null,
            owner: m.awayTeam ? owners.get(m.awayTeam.externalId) : undefined,
            isWinner: !!awayWin,
          },
        };
      });
    return { ord, matches: roundMatches };
  });
}
