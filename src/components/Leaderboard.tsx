import type { LeaderboardEntry } from "@/lib/scoring";

const MEDAL = ["🥇", "🥈", "🥉"];

// Compact ranked standings for the family.
export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="display text-lg">Leaderboard</h2>
        <span className="text-xs text-white/40">last team standing</span>
      </div>
      <ul className="divide-y divide-white/5">
        {entries.map((e) => (
          <li
            key={e.memberId}
            className="flex items-center gap-3 px-4 py-3"
            style={
              e.rank === 1 ? { background: "linear-gradient(90deg,#FFC72C18,transparent)" } : undefined
            }
          >
            <span className="w-7 text-center text-lg">
              {MEDAL[e.rank - 1] ?? <span className="text-sm text-white/40">{e.rank}</span>}
            </span>
            <span
              className="h-8 w-8 shrink-0 rounded-full"
              style={{ background: e.accentColor }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{e.memberName}</span>
                {e.hasChampion && <span title="Owns the champion">👑</span>}
              </div>
              <div className="text-xs text-white/45">
                {e.teamsAlive} alive · {e.goalsFor} goals
              </div>
            </div>
            <span className="hidden shrink-0 -space-x-1 sm:flex">
              {e.teams.slice(0, 8).map((t) => (
                <span
                  key={t.externalId}
                  className={`text-base ${t.eliminated ? "opacity-30 grayscale" : ""}`}
                  title={`${t.name}${t.eliminated ? " (out)" : ""}`}
                >
                  {t.flag}
                </span>
              ))}
            </span>
            <span className="display w-10 text-right text-xl" style={{ color: e.accentColor }}>
              {e.points}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
