import Link from "next/link";
import { DrawButton } from "@/components/DrawButton";
import { Leaderboard } from "@/components/Leaderboard";
import { MemberCard } from "@/components/MemberCard";
import { PrizePot } from "@/components/PrizePot";
import { FixtureRow } from "@/components/FixtureRow";
import { ScorePoller } from "@/components/ScorePoller";
import {
  getDrawStatus,
  getLeaderboard,
  getPrizes,
  getFixtures,
  getOwnerMap,
  getLiveWindow,
} from "@/lib/queries";
import { toFixtureRow } from "@/lib/view";
import { displayStatus, isInPlay, finishedStatus, APP_NAME } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { draw, ready } = await getDrawStatus();

  // Pre-draw hero.
  if (!draw) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mb-6 text-6xl">🏆⚽</div>
        <h1 className="display mb-3 text-4xl sm:text-5xl">{APP_NAME}</h1>
        <p className="mb-2 text-white/70">
          A 2026 FIFA World Cup sweepstake for the family.
        </p>
        <p className="mb-8 text-white/50">
          48 teams, 6 of us, 8 teams each. One fair draw, then last team standing wins the pot.
        </p>
        {ready ? (
          <DrawButton />
        ) : (
          <p className="rounded-xl bg-wc-red/15 px-4 py-3 text-sm text-wc-red">
            Teams not loaded yet. Run <code>npm run db:seed</code> to set up the tournament.
          </p>
        )}
      </div>
    );
  }

  const leaderboard = await getLeaderboard();
  const [prizes, owners, allFixtures, liveWindow] = await Promise.all([
    getPrizes(leaderboard),
    getOwnerMap(),
    getFixtures(),
    getLiveWindow(),
  ]);

  const live = allFixtures.filter((m) => isInPlay(displayStatus(m.status, m.kickoff)));
  const upcoming = allFixtures
    .filter((m) => displayStatus(m.status, m.kickoff) === "upcoming")
    .slice(0, 6);
  const recent = allFixtures
    .filter((m) => finishedStatus(m.status))
    .slice(-4)
    .reverse();
  const spotlight = (live.length ? live : upcoming).slice(0, 6);
  const champion = leaderboard.find((e) => e.hasChampion);

  return (
    <div className="space-y-6">
      <ScorePoller active={live.length > 0 || liveWindow} />

      <section className="card flex flex-col items-center justify-between gap-3 bg-wc-gradient p-5 sm:flex-row">
        <div>
          <h1 className="display text-2xl sm:text-3xl">The sweepstake is live</h1>
          <p className="text-sm text-white/60">
            {leaderboard.length} family members · {live.length} live now
          </p>
        </div>
        {champion ? (
          <div className="rounded-xl bg-wc-gold/20 px-4 py-2 text-center ring-1 ring-wc-gold/50">
            <div className="text-xs uppercase tracking-wide text-wc-gold/80">Champion's owner</div>
            <div className="display text-lg text-wc-gold">👑 {champion.memberName}</div>
          </div>
        ) : (
          <Link href="/bracket" className="btn-ghost">
            View the bracket →
          </Link>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Leaderboard entries={leaderboard} />
          <section>
            <h2 className="display mb-3 text-lg">The family &amp; their teams</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {leaderboard.map((entry) => (
                <MemberCard key={entry.memberId} entry={entry} />
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <PrizePot prizes={prizes} />
          <section className="card p-4">
            <h2 className="display mb-3 text-lg">
              {live.length ? "Live & next" : "Upcoming"}
            </h2>
            <div className="space-y-2">
              {spotlight.length ? (
                spotlight.map((m) => <FixtureRow key={m.id} m={toFixtureRow(m, owners)} />)
              ) : (
                <p className="text-sm text-white/50">No fixtures scheduled.</p>
              )}
            </div>
            <Link
              href="/fixtures"
              className="mt-3 block text-center text-sm text-wc-sky hover:underline"
            >
              All fixtures →
            </Link>
          </section>

          {recent.length > 0 && (
            <section className="card p-4">
              <h2 className="display mb-3 text-lg">Recent results</h2>
              <div className="space-y-2">
                {recent.map((m) => (
                  <FixtureRow key={m.id} m={toFixtureRow(m, owners)} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
