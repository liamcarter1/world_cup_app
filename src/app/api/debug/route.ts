import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// TEMPORARY diagnostic: shows exactly what API-Football returns for this key, so we can
// confirm whether the free plan covers the 2026 World Cup. Returns no secret values.
export async function GET(request: Request) {
  const secret = process.env.SETUP_SECRET;
  if (secret) {
    const url = new URL(request.url);
    if (url.searchParams.get("secret") !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const key = process.env.FOOTBALL_API_KEY;
  if (!key) return NextResponse.json({ error: "FOOTBALL_API_KEY not set" });
  const base = process.env.FOOTBALL_API_BASE ?? "https://v3.football.api-sports.io";

  async function probe(path: string) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { "x-apisports-key": key as string },
        cache: "no-store",
      });
      const json: any = await res.json();
      const r = json.response;
      let sample: unknown = r;
      if (Array.isArray(r)) {
        sample = r.slice(0, 2).map((f: any) =>
          f.fixture
            ? {
                home: f.teams?.home?.name,
                away: f.teams?.away?.name,
                status: f.fixture?.status?.short,
                date: f.fixture?.date,
                goals: f.goals,
              }
            : f.seasons
              ? { league: f.league?.name, seasons: f.seasons?.map((s: any) => s.year) }
              : f,
        );
      }
      return { http: res.status, errors: json.errors, results: json.results, sample };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  const [status, leagueWC, wc2026, wc2022, liveAll] = await Promise.all([
    probe(`/status`),
    probe(`/leagues?id=1`),
    probe(`/fixtures?league=1&season=2026`),
    probe(`/fixtures?league=1&season=2022`),
    probe(`/fixtures?live=all`),
  ]);

  return NextResponse.json({ status, leagueWC, wc2026, wc2022, liveAll });
}
