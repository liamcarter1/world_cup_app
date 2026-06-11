import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// TEMPORARY diagnostic: shows what API-Football returns for this key/season so we can
// see why the live overlay isn't applying. Returns no secrets. Remove after debugging.
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
      const sample = Array.isArray(json.response)
        ? json.response.slice(0, 3).map((f: any) => ({
            home: f.teams?.home?.name,
            away: f.teams?.away?.name,
            status: f.fixture?.status?.short,
            date: f.fixture?.date,
            goals: f.goals,
          }))
        : json.response;
      return {
        http: res.status,
        errors: json.errors,
        results: json.results,
        get: json.get,
        parameters: json.parameters,
        sample,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  const [status, wc2026, wc2022, live] = await Promise.all([
    probe(`/status`),
    probe(`/fixtures?league=1&season=2026`),
    probe(`/fixtures?league=1&season=2022`),
    probe(`/fixtures?live=all`),
  ]);

  return NextResponse.json({ status, wc2026, wc2022, live });
}
