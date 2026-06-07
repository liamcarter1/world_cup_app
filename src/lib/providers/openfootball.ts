import type { FootballDataProvider, ProviderSnapshot } from "@/lib/types";
import { parseOpenFootball, type OpenFootballData } from "@/data/openfootball-parse";

const URL =
  process.env.OPENFOOTBALL_URL ??
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// Free, no-key provider with the REAL 2026 schedule + results (community-maintained,
// refreshed from the repo — not minute-by-minute live). Used when no API key is set.
export class OpenFootballProvider implements FootballDataProvider {
  name = "openfootball";
  async getSnapshot(): Promise<ProviderSnapshot> {
    const res = await fetch(URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`OpenFootball ${res.status}`);
    const data = (await res.json()) as OpenFootballData;
    return parseOpenFootball(data);
  }
}
