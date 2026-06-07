// Bundled, no-network seed snapshot for the 2026 World Cup (48 teams, 104 matches).
// Groups/teams are a plausible placeholder set so the app is fully functional offline;
// real groups + live scores come from the API-Football provider in production.

import type { NormalizedTeam, NormalizedFixture, ProviderSnapshot } from "@/lib/types";

type RawTeam = { name: string; code: string; flag: string };

// 12 groups (A–L) of 4. Hosts (Mexico, Canada, USA) head groups A/B/C.
export const SEED_GROUPS: Record<string, RawTeam[]> = {
  A: [
    { name: "Mexico", code: "MEX", flag: "🇲🇽" },
    { name: "Croatia", code: "CRO", flag: "🇭🇷" },
    { name: "Nigeria", code: "NGA", flag: "🇳🇬" },
    { name: "Saudi Arabia", code: "KSA", flag: "🇸🇦" },
  ],
  B: [
    { name: "Canada", code: "CAN", flag: "🇨🇦" },
    { name: "Belgium", code: "BEL", flag: "🇧🇪" },
    { name: "Ecuador", code: "ECU", flag: "🇪🇨" },
    { name: "South Korea", code: "KOR", flag: "🇰🇷" },
  ],
  C: [
    { name: "USA", code: "USA", flag: "🇺🇸" },
    { name: "Wales", code: "WAL", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
    { name: "Iran", code: "IRN", flag: "🇮🇷" },
    { name: "Senegal", code: "SEN", flag: "🇸🇳" },
  ],
  D: [
    { name: "Argentina", code: "ARG", flag: "🇦🇷" },
    { name: "Poland", code: "POL", flag: "🇵🇱" },
    { name: "Australia", code: "AUS", flag: "🇦🇺" },
    { name: "Tunisia", code: "TUN", flag: "🇹🇳" },
  ],
  E: [
    { name: "Spain", code: "ESP", flag: "🇪🇸" },
    { name: "Germany", code: "GER", flag: "🇩🇪" },
    { name: "Japan", code: "JPN", flag: "🇯🇵" },
    { name: "Costa Rica", code: "CRC", flag: "🇨🇷" },
  ],
  F: [
    { name: "Brazil", code: "BRA", flag: "🇧🇷" },
    { name: "Switzerland", code: "SUI", flag: "🇨🇭" },
    { name: "Cameroon", code: "CMR", flag: "🇨🇲" },
    { name: "Serbia", code: "SRB", flag: "🇷🇸" },
  ],
  G: [
    { name: "France", code: "FRA", flag: "🇫🇷" },
    { name: "Denmark", code: "DEN", flag: "🇩🇰" },
    { name: "Morocco", code: "MAR", flag: "🇲🇦" },
    { name: "Panama", code: "PAN", flag: "🇵🇦" },
  ],
  H: [
    { name: "Portugal", code: "POR", flag: "🇵🇹" },
    { name: "Uruguay", code: "URU", flag: "🇺🇾" },
    { name: "Ghana", code: "GHA", flag: "🇬🇭" },
    { name: "Ivory Coast", code: "CIV", flag: "🇨🇮" },
  ],
  I: [
    { name: "England", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { name: "Netherlands", code: "NED", flag: "🇳🇱" },
    { name: "Egypt", code: "EGY", flag: "🇪🇬" },
    { name: "Qatar", code: "QAT", flag: "🇶🇦" },
  ],
  J: [
    { name: "Italy", code: "ITA", flag: "🇮🇹" },
    { name: "Colombia", code: "COL", flag: "🇨🇴" },
    { name: "Algeria", code: "ALG", flag: "🇩🇿" },
    { name: "Jamaica", code: "JAM", flag: "🇯🇲" },
  ],
  K: [
    { name: "Norway", code: "NOR", flag: "🇳🇴" },
    { name: "Sweden", code: "SWE", flag: "🇸🇪" },
    { name: "Austria", code: "AUT", flag: "🇦🇹" },
    { name: "Turkey", code: "TUR", flag: "🇹🇷" },
  ],
  L: [
    { name: "Ukraine", code: "UKR", flag: "🇺🇦" },
    { name: "Chile", code: "CHI", flag: "🇨🇱" },
    { name: "Paraguay", code: "PAR", flag: "🇵🇾" },
    { name: "Peru", code: "PER", flag: "🇵🇪" },
  ],
};

const VENUES = [
  "Estadio Azteca, Mexico City",
  "MetLife Stadium, New York",
  "SoFi Stadium, Los Angeles",
  "AT&T Stadium, Dallas",
  "Mercedes-Benz Stadium, Atlanta",
  "BMO Field, Toronto",
  "BC Place, Vancouver",
  "Estadio Akron, Guadalajara",
  "Levi's Stadium, San Francisco",
  "Hard Rock Stadium, Miami",
  "Arrowhead Stadium, Kansas City",
  "Lumen Field, Seattle",
];

export const SEED_TEAMS: NormalizedTeam[] = Object.entries(SEED_GROUPS).flatMap(
  ([letter, teams]) =>
    teams.map((t) => ({
      externalId: t.code,
      name: t.name,
      code: t.code,
      flag: t.flag,
      groupName: `Group ${letter}`,
    })),
);

// Round-robin pairings for a group of 4 (indices), one matchday per row.
const MATCHDAYS: [number, number][][] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [3, 1],
  ],
  [
    [3, 0],
    [1, 2],
  ],
];

function isoDay(dayOffset: number, hour: number): string {
  // Tournament opens 2026-06-11.
  const base = Date.UTC(2026, 5, 11, 0, 0, 0);
  return new Date(base + dayOffset * 86400000 + hour * 3600000).toISOString();
}

function buildFixtures(): NormalizedFixture[] {
  const fixtures: NormalizedFixture[] = [];
  const letters = Object.keys(SEED_GROUPS);
  let venueIdx = 0;

  // Group stage: 12 groups x 6 = 72 matches, spread over matchdays 0..12.
  MATCHDAYS.forEach((pairs, md) => {
    letters.forEach((letter, gi) => {
      const teams = SEED_GROUPS[letter];
      pairs.forEach(([h, a], pi) => {
        const dayOffset = md * 4 + Math.floor(gi / 3);
        const hour = 16 + ((gi + pi) % 4) * 2;
        fixtures.push({
          externalId: `GS-${letter}-${md + 1}-${pi + 1}`,
          round: "Group Stage",
          roundOrd: 0,
          groupName: `Group ${letter}`,
          kickoff: isoDay(dayOffset, hour),
          venue: VENUES[venueIdx++ % VENUES.length],
          status: "NS",
          homeExternalId: teams[h].code,
          awayExternalId: teams[a].code,
          homeGoals: null,
          awayGoals: null,
          winnerExternalId: null,
        });
      });
    });
  });

  // Knockouts: teams resolved later by the live feed. Placeholders here.
  const knockout: { round: string; ord: number; count: number; startDay: number }[] = [
    { round: "Round of 32", ord: 1, count: 16, startDay: 17 },
    { round: "Round of 16", ord: 2, count: 8, startDay: 22 },
    { round: "Quarter-final", ord: 3, count: 4, startDay: 26 },
    { round: "Semi-final", ord: 4, count: 2, startDay: 30 },
    { round: "Final", ord: 5, count: 1, startDay: 38 },
  ];
  // 3rd-place play-off sits just before the final (counts toward 104, no scoring weight).
  knockout.forEach(({ round, ord, count, startDay }) => {
    for (let i = 0; i < count; i++) {
      fixtures.push({
        externalId: `KO-${ord}-${i + 1}`,
        round,
        roundOrd: ord,
        groupName: null,
        kickoff: isoDay(startDay + Math.floor(i / 2), 18 + (i % 2) * 3),
        venue: VENUES[venueIdx++ % VENUES.length],
        status: "NS",
        homeExternalId: null,
        awayExternalId: null,
        homeGoals: null,
        awayGoals: null,
        winnerExternalId: null,
      });
    }
  });
  fixtures.push({
    externalId: "KO-3P-1",
    round: "Third-place play-off",
    roundOrd: 4,
    groupName: null,
    kickoff: isoDay(37, 18),
    venue: VENUES[venueIdx++ % VENUES.length],
    status: "NS",
    homeExternalId: null,
    awayExternalId: null,
    homeGoals: null,
    awayGoals: null,
    winnerExternalId: null,
  });

  return fixtures;
}

export const SEED_FIXTURES: NormalizedFixture[] = buildFixtures();

export function seedSnapshot(): ProviderSnapshot {
  return { source: "seed", teams: SEED_TEAMS, fixtures: SEED_FIXTURES };
}
