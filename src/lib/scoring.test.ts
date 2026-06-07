import { describe, it, expect } from "vitest";
import {
  deriveTeamStates,
  teamPoints,
  buildLeaderboard,
  allocatePrizes,
  type ScoringMatch,
  type ScoringTeam,
  type MemberWithTeams,
} from "./scoring";

const team = (externalId: string, groupName = "Group A"): ScoringTeam => ({
  externalId,
  groupName,
});

const finalMatch = (
  home: string,
  away: string,
  hg: number,
  ag: number,
): ScoringMatch => ({
  roundOrd: 5,
  groupName: null,
  status: "FT",
  homeExternalId: home,
  awayExternalId: away,
  homeGoals: hg,
  awayGoals: ag,
  winnerExternalId: hg > ag ? home : away,
});

describe("deriveTeamStates", () => {
  it("crowns the Final winner as champion (36 pts) and runner-up (24 pts, eliminated)", () => {
    const teams = [team("A"), team("B")];
    const matches = [finalMatch("A", "B", 2, 1)];
    const states = deriveTeamStates(teams, matches);

    const a = states.get("A")!;
    const b = states.get("B")!;
    expect(a.isChampion).toBe(true);
    expect(a.furthestRound).toBe(5);
    expect(a.eliminated).toBe(false);
    expect(teamPoints(a)).toBe(36);

    expect(b.isChampion).toBe(false);
    expect(b.furthestRound).toBe(5);
    expect(b.eliminated).toBe(true);
    expect(teamPoints(b)).toBe(24);

    expect(a.goalsFor).toBe(2);
    expect(b.goalsFor).toBe(1);
  });

  it("rewards group survival (R32 reached = 3 pts) and eliminates teams that don't advance", () => {
    const teams = [team("P", "Group Z"), team("Q", "Group Z")];
    const matches: ScoringMatch[] = [
      {
        roundOrd: 0,
        groupName: "Group Z",
        status: "FT",
        homeExternalId: "P",
        awayExternalId: "Q",
        homeGoals: 1,
        awayGoals: 0,
        winnerExternalId: "P",
      },
      // P advances to a (resolved) Round of 32 tie; Q does not.
      {
        roundOrd: 1,
        groupName: null,
        status: "NS",
        homeExternalId: "P",
        awayExternalId: "R",
        homeGoals: null,
        awayGoals: null,
        winnerExternalId: null,
      },
    ];
    const states = deriveTeamStates(teams, matches);
    const p = states.get("P")!;
    const q = states.get("Q")!;

    expect(p.furthestRound).toBe(1);
    expect(p.eliminated).toBe(false);
    expect(teamPoints(p)).toBe(3);

    expect(q.furthestRound).toBe(0);
    expect(q.eliminated).toBe(true);
    expect(teamPoints(q)).toBe(0);
  });
});

describe("buildLeaderboard", () => {
  const members: MemberWithTeams[] = [
    {
      id: "m1",
      name: "Liam",
      accentColor: "#E4002B",
      teams: [
        { externalId: "A", name: "Argentina", flag: "🇦🇷" },
        { externalId: "B", name: "Brazil", flag: "🇧🇷" },
      ],
    },
    {
      id: "m2",
      name: "Heidi",
      accentColor: "#FFC72C",
      teams: [
        { externalId: "C", name: "Croatia", flag: "🇭🇷" },
        { externalId: "D", name: "Denmark", flag: "🇩🇰" },
      ],
    },
  ];

  it("ranks the champion's owner top and applies tie-breaks", () => {
    const matches = [finalMatch("A", "C", 3, 0)];
    const teams = [team("A"), team("B"), team("C"), team("D")];
    const states = deriveTeamStates(teams, matches);
    const lb = buildLeaderboard(members, states);

    expect(lb[0].memberName).toBe("Liam");
    expect(lb[0].rank).toBe(1);
    expect(lb[0].hasChampion).toBe(true);
    // Liam: champion A (36) + B (0). Heidi: runner-up C (24) + D (0).
    expect(lb[0].points).toBe(36);
    expect(lb[1].points).toBe(24);
  });

  it("breaks point ties by teams still alive", () => {
    // No matches => everyone 0 points, nobody eliminated, equal -> alphabetical.
    const teams = [team("A"), team("B"), team("C"), team("D")];
    const states = deriveTeamStates(teams, []);
    const lb = buildLeaderboard(members, states);
    expect(lb[0].points).toBe(0);
    expect(lb[1].points).toBe(0);
    expect(lb[0].memberName).toBe("Heidi"); // alphabetical fallback
  });
});

describe("allocatePrizes", () => {
  it("splits the pot across champion, runner-up and most goals", () => {
    const members: MemberWithTeams[] = [
      {
        id: "m1",
        name: "Liam",
        accentColor: "#E4002B",
        teams: [{ externalId: "A", name: "Argentina", flag: "🇦🇷" }],
      },
      {
        id: "m2",
        name: "Heidi",
        accentColor: "#FFC72C",
        teams: [{ externalId: "C", name: "Croatia", flag: "🇭🇷" }],
      },
    ];
    const matches = [finalMatch("A", "C", 4, 2)];
    const states = deriveTeamStates([team("A"), team("C")], matches);
    const lb = buildLeaderboard(members, states);
    const ownerByTeam = new Map([
      ["A", { memberName: "Liam", teamName: "Argentina" }],
      ["C", { memberName: "Heidi", teamName: "Croatia" }],
    ]);
    const prizes = allocatePrizes(lb, matches, ownerByTeam);

    expect(prizes.champion?.memberName).toBe("Liam");
    expect(prizes.runnerUp?.memberName).toBe("Heidi");
    expect(prizes.mostGoals?.memberName).toBe("Liam"); // 4 goals
  });
});
