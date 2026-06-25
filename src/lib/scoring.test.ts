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
    expect(teamPoints(a)).toBe(38); // 24 (final) + 12 (champion) + 2 goals

    expect(b.isChampion).toBe(false);
    expect(b.furthestRound).toBe(5);
    expect(b.eliminated).toBe(true);
    expect(teamPoints(b)).toBe(25); // 24 (runner-up) + 1 goal

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
    expect(teamPoints(p)).toBe(4); // 3 (reached R32) + 1 goal

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
    // Liam: champion A (36 + 3 goals = 39) + B (0). Heidi: runner-up C (24 + 0) + D (0).
    expect(lb[0].points).toBe(39);
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

describe("knockout qualification", () => {
  const A = ["GA1", "GA2", "GA3", "GA4"];
  const teams: ScoringTeam[] = [
    ...A.map((id) => ({ externalId: id, groupName: "Group A" })),
    { externalId: "GB1", groupName: "Group B" },
    { externalId: "GB2", groupName: "Group B" },
  ];
  const gm = (h: string, a: string, hg: number, ag: number): ScoringMatch => ({
    roundOrd: 0,
    groupName: "Group A",
    status: "FT",
    homeExternalId: h,
    awayExternalId: a,
    homeGoals: hg,
    awayGoals: ag,
    winnerExternalId: hg > ag ? h : ag > hg ? a : null,
  });
  const r32 = (home: string): ScoringMatch => ({
    roundOrd: 1,
    groupName: null,
    status: "NS",
    homeExternalId: home,
    awayExternalId: null, // opponent still to be decided
    homeGoals: null,
    awayGoals: null,
    winnerExternalId: null,
  });
  const matches: ScoringMatch[] = [
    gm("GA1", "GA2", 2, 0), gm("GA1", "GA3", 2, 0), gm("GA1", "GA4", 2, 0),
    gm("GA2", "GA3", 1, 0), gm("GA2", "GA4", 1, 0), gm("GA3", "GA4", 1, 0),
    r32("GA1"), r32("GA2"),
    // Group B unfinished, so not all groups are complete yet.
    { roundOrd: 0, groupName: "Group B", status: "NS", homeExternalId: "GB1", awayExternalId: "GB2", homeGoals: null, awayGoals: null, winnerExternalId: null },
  ];
  const st = deriveTeamStates(teams, matches);

  it("keeps qualified teams in once slotted into a knockout tie (even vs TBD)", () => {
    expect(st.get("GA1")!.furthestRound).toBe(1);
    expect(st.get("GA1")!.eliminated).toBe(false);
    expect(teamPoints(st.get("GA1")!)).toBe(9); // 3 (reached R32) + 6 goals
    expect(st.get("GA2")!.furthestRound).toBe(1);
    expect(st.get("GA2")!.eliminated).toBe(false);
  });

  it("eliminates 4th place, but keeps a 3rd-placed team pending until all groups finish", () => {
    expect(st.get("GA4")!.eliminated).toBe(true);
    expect(st.get("GA3")!.eliminated).toBe(false);
  });
});
