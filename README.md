# 🏆 All together now

A 2026 FIFA World Cup **family sweepstake** for 6 people. One fair, one-time random draw deals
8 of the 48 teams to each family member, live scores update automatically, and a
**last-team-standing** leaderboard tracks who's winning the £30 pot.

Built with **Next.js (App Router) + React + Tailwind + Prisma**, deployable to **Vercel**.

## Features

- ⚽ **Real fixtures** — the actual 2026 World Cup schedule (official draw: 48 teams, 12 groups,
  104 matches) sourced from openfootball, bundled so it works with **no key**, and refreshed live.
- 🎲 **One-time, fair draw** — seeded Fisher–Yates shuffle, dealt atomically and permanently locked.
  The draw seed is stored and shown so everyone can verify fairness.
- 📡 **Live scores** from API-Football (real-time in-play) when a key is set, falling back to the
  real openfootball schedule, then a bundled offline copy.
- 🏅 **Last-team-standing scoring** — points as your teams advance (group → R32 → R16 → QF → SF →
  Final), big bonus + main prize for the champion's owner.
- 🗺️ **Knockout bracket** tinted by each owner's colour.
- 👤 **Per-member dashboards** with their teams, points and upcoming fixtures.
- 💷 **£30 prize pot** split: champion's owner £20, runner-up's owner £7, most goals £3.
- 🎨 Bold 2026 World Cup theme; each family member has a distinct accent colour.

## Family

Liam · Heidi · Sam · Liz P · Liz C · Phil

## Quick start (local)

Uses Postgres. The fastest path is a free [Neon](https://neon.tech) database.

```bash
npm install
cp .env.example .env        # then set DATABASE_URL to your Postgres URL
npm run db:push             # create the schema
npm run db:seed             # load 6 members + 48 teams + 104 fixtures
npm run dev                 # http://localhost:3000
```

Then open the app and click **Randomly assign teams** once to run the draw.

## Tests

```bash
npm test                    # scoring engine unit tests (vitest)
```

## Data sources (fixtures & scores)

The app reads through one provider, chosen automatically (`src/lib/providers`):

1. **API-Football** — real-time in-play scores. Used when `FOOTBALL_API_KEY` is set.
2. **openfootball** — the real 2026 schedule + results, free and key-less (refreshed from its
   public repo, not minute-by-minute live).
3. **Bundled snapshot** (`src/data/worldcup-2026.json`) — the same real schedule, offline fallback.

So fixtures and team names are **always real**; an API key only adds live in-play scoring.

> **Tip:** pick your data source *before* running the draw. API-Football identifies teams by its
> own numeric IDs while the openfootball/bundled sources use country names, so switching to an API
> key after drawing would not line up assignments. For live scores, set `FOOTBALL_API_KEY` before
> the first seed + draw.

Add an API-Football key to `.env`:

```
FOOTBALL_API_KEY=your_key
```

Live updates work on Vercel's **Hobby** plan (which only allows a daily cron):

- During a match window the app's in-page poller calls `/api/live`, which runs a **server-throttled**
  sync — at most ~1 real API call every 5 minutes plus a daily cap, so any number of phones polling
  at once stays well under the free tier's 100 requests/day.
- A daily Vercel cron (`/api/cron/sync`) gives a baseline refresh.
- **/admin → "Sync scores now"** forces an immediate refresh any time.

(On the Pro plan you can additionally bump the cron in `vercel.json` to e.g. `*/10 * * * *`.)

## Deploying to Vercel (shared, online)

1. Import the repo into Vercel (or use the Vercel CLI / MCP deploy).
2. Add a Postgres database: Vercel dashboard → **Storage → Create → Postgres (Neon)** and connect
   it to the project. This injects `DATABASE_URL` automatically. (Or add a Neon URL as `DATABASE_URL`.)
3. Set env vars: `SETUP_SECRET` (required), and optionally `FOOTBALL_API_KEY` (live scores),
   `CRON_SECRET`, `ADMIN_PASSWORD`.
4. Redeploy. The build runs `prisma db push` to create the schema.
5. Seed once by visiting `https://<your-app>/api/setup?secret=<SETUP_SECRET>`.

Everyone in the family then sees the same draw and live leaderboard from their own phones.
The schema is created at build time; the one-time `/api/setup` call loads members + the real fixtures.

## Resetting

The draw is one-time. To start over before the tournament:

```bash
npm run db:reset            # wipes + re-seeds (no draw)
```
