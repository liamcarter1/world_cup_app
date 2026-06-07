# 🏆 All together now

A 2026 FIFA World Cup **family sweepstake** for 6 people. One fair, one-time random draw deals
8 of the 48 teams to each family member, live scores update automatically, and a
**last-team-standing** leaderboard tracks who's winning the £30 pot.

Built with **Next.js (App Router) + React + Tailwind + Prisma**, deployable to **Vercel**.

## Features

- 🎲 **One-time, fair draw** — seeded Fisher–Yates shuffle, dealt atomically and permanently locked.
  The draw seed is stored and shown so everyone can verify fairness.
- 📡 **Live scores** from API-Football (with a no-key seed fallback so it runs instantly).
- 🏅 **Last-team-standing scoring** — points as your teams advance (group → R32 → R16 → QF → SF →
  Final), big bonus + main prize for the champion's owner.
- 🗺️ **Knockout bracket** tinted by each owner's colour.
- 👤 **Per-member dashboards** with their teams, points and upcoming fixtures.
- 💷 **£30 prize pot** split: champion's owner £20, runner-up's owner £7, most goals £3.
- 🎨 Bold 2026 World Cup theme; each family member has a distinct accent colour.

## Family

Liam · Heidi · Sam · Liz P · Liz C · Phil

## Quick start (local, no keys needed)

```bash
npm install
cp .env.example .env        # SQLite + seed work out of the box
npm run db:push             # create the SQLite schema
npm run db:seed             # load 6 members + 48 teams + 104 fixtures
npm run dev                 # http://localhost:3000
```

Then open the app and click **Randomly assign teams** once to run the draw.

## Tests

```bash
npm test                    # scoring engine unit tests (vitest)
```

## Live scores

Add an API-Football key to `.env`:

```
FOOTBALL_API_KEY=your_key
```

Sync from **/admin** ("Sync scores now") or let the Vercel Cron (`vercel.json`, every 10 min) do it.
The sync is rate-budgeted: it only calls the API when a match is live or imminent, keeping well
under the free tier's 100 requests/day.

## Deploying to Vercel (shared, online)

1. Push to GitHub and import the repo into Vercel.
2. Add the **Neon Postgres** integration → it sets `DATABASE_URL`.
3. In `prisma/schema.prisma`, change the datasource `provider` to `"postgresql"`.
4. Set env vars: `FOOTBALL_API_KEY`, `CRON_SECRET`, `ADMIN_PASSWORD`.
5. Deploy. Run `npx prisma db push` + `npm run db:seed` against the Neon DB once.

Everyone in the family then sees the same draw and live leaderboard from their own phones.

## Resetting

The draw is one-time. To start over before the tournament:

```bash
npm run db:reset            # wipes + re-seeds (no draw)
```
