import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// TEMPORARY: probe free, no-key score sources from Vercel to find one that carries
// live 2026 World Cup results. Remove after we wire the working one in.
export async function GET() {
  async function getJson(url: string) {
    try {
      const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "wc-app" } });
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        return { url, http: res.status, nonJson: text.slice(0, 120) };
      }
      return { http: res.status, json };
    } catch (e) {
      return { url, error: e instanceof Error ? e.message : String(e) };
    }
  }

  function summariseEspn(r: any) {
    const j = r?.json;
    if (!j) return r;
    const events = (j.events ?? []).map((e: any) => {
      const c = e.competitions?.[0];
      const cs = c?.competitors ?? [];
      const home = cs.find((x: any) => x.homeAway === "home");
      const away = cs.find((x: any) => x.homeAway === "away");
      return {
        home: home?.team?.displayName,
        hs: home?.score,
        away: away?.team?.displayName,
        as: away?.score,
        state: e.status?.type?.state,
        detail: e.status?.type?.detail,
        date: e.date,
      };
    });
    return { http: r.http, count: events.length, events: events.slice(0, 6) };
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const [espnNow, espnToday, espnYday] = await Promise.all([
    getJson("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"),
    getJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${today}`),
    getJson(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${
        new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, "")
      }`,
    ),
  ]);

  return NextResponse.json({
    now: new Date().toISOString(),
    espnNow: summariseEspn(espnNow),
    espnToday: summariseEspn(espnToday),
    espnYesterday: summariseEspn(espnYday),
  });
}
