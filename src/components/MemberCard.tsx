import Link from "next/link";
import { TeamChip } from "./TeamChip";
import type { LeaderboardEntry } from "@/lib/scoring";

// A family member's card: accent ring, point total, and their (up to 8) teams.
export function MemberCard({ entry }: { entry: LeaderboardEntry }) {
  return (
    <Link
      href={`/members/${entry.memberId}`}
      className="card group block p-4 transition-transform hover:-translate-y-0.5"
      style={{ boxShadow: `inset 0 0 0 1px ${entry.accentColor}40` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-wc-charcoal"
            style={{ background: entry.accentColor }}
          >
            {entry.memberName.slice(0, 1)}
          </span>
          <div>
            <div className="display text-base leading-none">{entry.memberName}</div>
            <div className="text-xs text-white/50">
              {entry.teamsAlive} alive · {entry.teams.length} teams
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="display text-2xl leading-none" style={{ color: entry.accentColor }}>
            {entry.points}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-white/40">points</div>
        </div>
      </div>

      {entry.hasChampion && (
        <div className="mb-2 rounded-lg bg-wc-gold/15 px-2 py-1 text-center text-xs font-semibold text-wc-gold ring-1 ring-wc-gold/40">
          👑 Owns the World Cup champion
        </div>
      )}

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
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
    </Link>
  );
}
