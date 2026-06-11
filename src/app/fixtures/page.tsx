import { FixtureRow } from "@/components/FixtureRow";
import { ScorePoller } from "@/components/ScorePoller";
import { getFixtures, getOwnerMap, getLiveWindow } from "@/lib/queries";
import { toFixtureRow } from "@/lib/view";
import { displayStatus, isInPlay, ROUND_LABELS } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  const [owners, fixtures, liveWindow] = await Promise.all([
    getOwnerMap(),
    getFixtures(),
    getLiveWindow(),
  ]);
  const live = fixtures.filter((m) => isInPlay(displayStatus(m.status, m.kickoff)));

  // Group by round for readability.
  const byRound = new Map<number, typeof fixtures>();
  for (const m of fixtures) {
    const arr = byRound.get(m.roundOrd) ?? [];
    arr.push(m);
    byRound.set(m.roundOrd, arr);
  }
  const order = Array.from(byRound.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <ScorePoller active={live.length > 0 || liveWindow} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-3xl">Fixtures</h1>
          <p className="text-sm text-white/50">{fixtures.length} matches · all 104 of them</p>
        </div>
        {live.length > 0 && (
          <span className="chip bg-wc-red/20 text-wc-red ring-1 ring-wc-red/40">
            <span className="h-2 w-2 animate-pulse-live rounded-full bg-wc-red" />
            {live.length} live
          </span>
        )}
      </div>

      {order.map((ord) => (
        <section key={ord}>
          <h2 className="display mb-3 text-lg text-white/80">{ROUND_LABELS[ord] ?? "Other"}</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {byRound
              .get(ord)!
              .map((m) => <FixtureRow key={m.id} m={toFixtureRow(m, owners)} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
