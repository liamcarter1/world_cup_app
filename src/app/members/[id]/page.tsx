import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamChip } from "@/components/TeamChip";
import { FixtureRow } from "@/components/FixtureRow";
import { ScorePoller } from "@/components/ScorePoller";
import { getLeaderboard, getFixtures, getOwnerMap, getLiveWindow } from "@/lib/queries";
import { toFixtureRow } from "@/lib/view";
import { displayStatus, isInPlay, finishedStatus, PRIZE_POT } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leaderboard = await getLeaderboard();
  const entry = leaderboard.find((e) => e.memberId === id);
  if (!entry) notFound();

  const teamIds = new Set(entry.teams.map((t) => t.externalId));
  const [owners, allFixtures, liveWindow] = await Promise.all([
    getOwnerMap(),
    getFixtures(),
    getLiveWindow(),
  ]);
  const myFixtures = allFixtures.filter(
    (m) =>
      (m.homeTeam && teamIds.has(m.homeTeam.externalId)) ||
      (m.awayTeam && teamIds.has(m.awayTeam.externalId)),
  );
  const live = myFixtures.filter((m) => isInPlay(displayStatus(m.status, m.kickoff)));
  const upcoming = myFixtures
    .filter((m) => displayStatus(m.status, m.kickoff) === "upcoming")
    .slice(0, 6);
  const results = myFixtures.filter((m) => finishedStatus(m.status)).slice(-6).reverse();

  return (
    <div className="space-y-6">
      <ScorePoller active={live.length > 0 || liveWindow} />
      <Link href="/members" className="text-sm text-wc-sky hover:underline">
        ← Back to family
      </Link>

      <section
        className="card flex items-center justify-between p-5"
        style={{ boxShadow: `inset 0 0 0 2px ${entry.accentColor}55` }}
      >
        <div className="flex items-center gap-3">
          <span
            className="grid h-14 w-14 place-items-center rounded-full text-xl font-bold text-wc-charcoal"
            style={{ background: entry.accentColor }}
          >
            {entry.memberName.slice(0, 1)}
          </span>
          <div>
            <h1 className="display text-3xl">{entry.memberName}</h1>
            <p className="text-sm text-white/50">
              Rank #{entry.rank} · {entry.teamsAlive}/{entry.teams.length} alive ·{" "}
              {entry.goalsFor} goals
              {entry.hasChampion && " · 👑 champion's owner"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="display text-4xl" style={{ color: entry.accentColor }}>
            {entry.points}
          </div>
          <div className="text-xs uppercase tracking-wide text-white/40">points</div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="display mb-3 text-lg">My 8 teams</h2>
          <div className="grid gap-2">
            {entry.teams.map((t) => (
              <TeamChip
                key={t.externalId}
                name={t.name}
                flag={t.flag}
                furthestRound={t.furthestRound}
                eliminated={t.eliminated}
                isChampion={t.isChampion}
                points={t.points}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-white/40">
            Win {PRIZE_POT.currency}
            {PRIZE_POT.splits[0].amount} if your team lifts the trophy.
          </p>
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="display mb-3 text-lg">
              {live.length ? "Live & upcoming" : "Upcoming"} for my teams
            </h2>
            <div className="space-y-2">
              {[...live, ...upcoming].length ? (
                [...live, ...upcoming].map((m) => (
                  <FixtureRow key={m.id} m={toFixtureRow(m, owners)} />
                ))
              ) : (
                <p className="text-sm text-white/50">No upcoming fixtures.</p>
              )}
            </div>
          </div>
          {results.length > 0 && (
            <div>
              <h2 className="display mb-3 text-lg">Recent results</h2>
              <div className="space-y-2">
                {results.map((m) => (
                  <FixtureRow key={m.id} m={toFixtureRow(m, owners)} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
