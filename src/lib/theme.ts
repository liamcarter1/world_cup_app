// Shared theme constants used across server + client components.

export const APP_NAME = "All together now";
export const APP_TAGLINE = "2026 World Cup family sweepstake";

// Distinct accent per family member. Order matches seeded sortOrder.
export const MEMBER_ACCENTS: Record<string, string> = {
  red: "#E4002B",
  gold: "#FFC72C",
  green: "#00843D",
  sky: "#3AAEE0",
  purple: "#9B4DE0",
  teal: "#0FB5A0",
};

export const FAMILY_MEMBERS: { name: string; accentColor: string }[] = [
  { name: "Liam", accentColor: MEMBER_ACCENTS.red },
  { name: "Heidi", accentColor: MEMBER_ACCENTS.gold },
  { name: "Sam", accentColor: MEMBER_ACCENTS.green },
  { name: "Liz P", accentColor: MEMBER_ACCENTS.sky },
  { name: "Liz C", accentColor: MEMBER_ACCENTS.purple },
  { name: "Phil", accentColor: MEMBER_ACCENTS.teal },
];

// Prize pot: £5 x 6 = £30, split.
export const PRIZE_POT = {
  buyIn: 5,
  total: 30,
  currency: "£",
  splits: [
    { label: "Champion's owner", amount: 20, key: "champion" },
    { label: "Runner-up's owner", amount: 7, key: "runnerUp" },
    { label: "Most goals", amount: 3, key: "mostGoals" },
  ],
} as const;

// Round labels by ordinal.
export const ROUND_LABELS = [
  "Group Stage",
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Final",
] as const;

export const ROUND_SHORT = ["Group", "R32", "R16", "QF", "SF", "Final"] as const;

export function liveStatus(status: string): boolean {
  return ["1H", "HT", "2H", "ET", "P", "BT", "SUSP", "INT"].includes(status);
}

export function finishedStatus(status: string): boolean {
  return ["FT", "AET", "PEN"].includes(status);
}
