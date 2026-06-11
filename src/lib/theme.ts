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

// Display state for a fixture, derived from its real status AND the clock so the app
// shows "In Play" during a match even before a (free-source) result is posted.
export type DisplayStatus = "upcoming" | "inplay" | "await" | "live" | "ft";

// A match is treated as in-play for ~2.5h after kick-off (covers extra time + pens).
const INPLAY_MS = 150 * 60 * 1000;

export function displayStatus(
  status: string,
  kickoff: Date | string,
  now: number = Date.now(),
): DisplayStatus {
  if (finishedStatus(status)) return "ft";
  if (liveStatus(status)) return "live";
  const k = new Date(kickoff).getTime();
  if (now >= k && now < k + INPLAY_MS) return "inplay";
  if (now >= k + INPLAY_MS) return "await";
  return "upcoming";
}

export function isInPlay(ds: DisplayStatus): boolean {
  return ds === "live" || ds === "inplay";
}
