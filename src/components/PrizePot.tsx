import { PRIZE_POT } from "@/lib/theme";
import type { PrizeAllocation } from "@/lib/scoring";

// Live £30 split-pot tracker.
export function PrizePot({ prizes }: { prizes: PrizeAllocation }) {
  const winners: Record<string, string> = {
    champion: prizes.champion
      ? `${prizes.champion.memberName} · ${prizes.champion.teamName}`
      : "—",
    runnerUp: prizes.runnerUp
      ? `${prizes.runnerUp.memberName} · ${prizes.runnerUp.teamName}`
      : "—",
    mostGoals: prizes.mostGoals
      ? `${prizes.mostGoals.memberName} · ${prizes.mostGoals.goals} goals`
      : "—",
  };

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="display text-lg">Prize pot</h2>
        <span className="display text-2xl text-wc-gold">
          {PRIZE_POT.currency}
          {PRIZE_POT.total}
        </span>
      </div>
      <p className="mb-3 text-xs text-white/45">
        {PRIZE_POT.currency}
        {PRIZE_POT.buyIn} each × 6 family members
      </p>
      <ul className="space-y-2">
        {PRIZE_POT.splits.map((s) => (
          <li
            key={s.key}
            className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2"
          >
            <div>
              <div className="text-sm font-medium">{s.label}</div>
              <div className="text-xs text-white/50">{winners[s.key]}</div>
            </div>
            <span className="display text-lg text-wc-gold">
              {PRIZE_POT.currency}
              {s.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
