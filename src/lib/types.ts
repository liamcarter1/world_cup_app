// Normalized shapes that every data provider (API-Football, OpenFootball, seed) emits.
// The rest of the app only ever sees these — never raw provider payloads.

export interface NormalizedTeam {
  externalId: string;
  name: string;
  code: string;
  flag: string; // emoji flag
  groupName: string; // "Group A" .. "Group L"
}

export interface NormalizedFixture {
  externalId: string;
  round: string; // raw label
  roundOrd: number; // 0..5
  groupName: string | null;
  kickoff: string; // ISO
  venue: string | null;
  status: string; // NS, 1H, FT, ...
  homeExternalId: string | null;
  awayExternalId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  // for knockout winner resolution when goals are level (pens)
  winnerExternalId: string | null;
}

export interface ProviderSnapshot {
  source: string;
  teams: NormalizedTeam[];
  fixtures: NormalizedFixture[];
}

export interface FootballDataProvider {
  name: string;
  getSnapshot(): Promise<ProviderSnapshot>;
}
