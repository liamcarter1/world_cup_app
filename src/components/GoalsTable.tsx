import type { LeaderboardEntry } from "@/lib/scoring";
import { PRIZE_POT } from "@/lib/theme";

const MEDAL = ["🥇", "🥈", "🥉"];

// Live "Golden Boot" race — family ranked by total goals their teams have scored.
// The leader holds the £3 most-goals prize.
export function GoalsTable({ entries }: { entries: LeaderboardEntry[] }) {
  const ranked = [...entries].sort((a, b) => b.goalsFor - a.goalsFor);
  const anyGoals = ranked.some((e) => e.goalsFor > 0);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="display text-lg">⚽ Golden Boot</h2>
        <span className="text-xs text-white/40">most goals · £{PRIZE_POT.splits[2].amount}</span>
      </div>
      {anyGoals ? (
        <ul className="divide-y divide-white/5">
          {ranked.map((e, i) => (
            <li
              key={e.memberId}
              className="flex items-center gap-3 px-4 py-2.5"
              style={
                i === 0 ? { background: "linear-gradient(90deg,#FFC72C14,transparent)" } : undefined
              }
            >
              <span className="w-6 text-center text-base">
                {MEDAL[i] ?? <span className="text-sm text-white/40">{i + 1}</span>}
              </span>
              <span
                className="h-7 w-7 shrink-0 rounded-full"
                style={{ background: e.accentColor }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-medium">{e.memberName}</span>
              {i === 0 && e.goalsFor > 0 && (
                <span className="chip bg-wc-gold/15 text-wc-gold">£{PRIZE_POT.splits[2].amount}</span>
              )}
              <span className="display w-8 text-right text-lg tabular-nums">{e.goalsFor}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-sm text-white/50">
          No goals yet — the race starts at kick-off. Each goal your teams score is also +1 point.
        </p>
      )}
    </div>
  );
}
