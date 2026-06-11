import { ROUND_POINTS, CHAMPION_BONUS, GOAL_POINTS } from "@/lib/scoring";
import { PRIZE_POT } from "@/lib/theme";

// Friendly milestone labels paired with the cumulative points for that round.
const MILESTONES: { label: string; ord: number }[] = [
  { label: "Get out of the group (reach the Last 32)", ord: 1 },
  { label: "Reach the Last 16", ord: 2 },
  { label: "Reach the Quarter-finals", ord: 3 },
  { label: "Reach the Semi-finals", ord: 4 },
  { label: "Reach the Final", ord: 5 },
];

const CHAMPION_TOTAL = ROUND_POINTS[5] + CHAMPION_BONUS;

// Expandable explainer so the family can check how points & prizes work any time.
export function HowItWorks() {
  return (
    <details className="card group p-0">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 marker:content-none">
        <span className="display text-base">❓ How scoring &amp; prizes work</span>
        <span className="text-xs text-white/40 group-open:hidden">tap to open</span>
        <span className="hidden text-xs text-white/40 group-open:inline">tap to close</span>
      </summary>

      <div className="space-y-4 border-t border-white/10 px-4 py-4 text-sm text-white/80">
        <div>
          <p className="mb-2">
            You each own <strong>8 teams</strong>. Your score is the points from all 8 added up. The
            further a team goes, the more it banks (points are cumulative):
          </p>
          <ul className="space-y-1">
            {MILESTONES.map((m) => (
              <li
                key={m.ord}
                className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-1.5"
              >
                <span>{m.label}</span>
                <span className="display text-wc-gold">{ROUND_POINTS[m.ord]} pts</span>
              </li>
            ))}
            <li className="flex items-center justify-between rounded-lg bg-wc-gold/10 px-3 py-1.5 ring-1 ring-wc-gold/30">
              <span>🏆 Win the World Cup</span>
              <span className="display text-wc-gold">{CHAMPION_TOTAL} pts</span>
            </li>
          </ul>
          <p className="mt-2 text-white/70">
            ⚽ Plus <strong>+{GOAL_POINTS} point for every goal</strong> your teams score — so even
            teams knocked out early keep earning you points.
          </p>
        </div>

        <div>
          <p className="mb-1 font-semibold text-white">If two people are level on points</p>
          <p className="text-white/70">
            Tie broken by: most teams still in → whose single team got furthest → most goals → name.
          </p>
        </div>

        <div>
          <p className="mb-1 font-semibold text-white">
            The prize pot ({PRIZE_POT.currency}
            {PRIZE_POT.buyIn} each = {PRIZE_POT.currency}
            {PRIZE_POT.total})
          </p>
          <ul className="space-y-1 text-white/70">
            {PRIZE_POT.splits.map((s) => (
              <li key={s.key} className="flex items-center justify-between">
                <span>{s.label}</span>
                <span className="text-wc-gold">
                  {PRIZE_POT.currency}
                  {s.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
