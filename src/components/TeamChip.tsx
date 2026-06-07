import { ROUND_SHORT } from "@/lib/theme";

interface TeamChipProps {
  name: string;
  flag: string;
  furthestRound?: number;
  eliminated?: boolean;
  isChampion?: boolean;
  points?: number;
}

// A team pill that reflects its tournament state (alive / out / champion).
export function TeamChip({
  name,
  flag,
  furthestRound = 0,
  eliminated = false,
  isChampion = false,
  points,
}: TeamChipProps) {
  const tone = isChampion
    ? "bg-wc-gold/20 text-wc-gold ring-1 ring-wc-gold/50"
    : eliminated
      ? "bg-white/[0.03] text-white/35 line-through ring-1 ring-white/5"
      : "bg-white/[0.07] text-white ring-1 ring-white/10";

  return (
    <div className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${tone}`}>
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-lg leading-none">{flag}</span>
        <span className="truncate text-sm font-medium">{name}</span>
        {isChampion && <span title="Champion">👑</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs">
        {!eliminated && furthestRound > 0 && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-white/70">
            {ROUND_SHORT[Math.min(furthestRound, ROUND_SHORT.length - 1)]}
          </span>
        )}
        {eliminated && <span className="text-white/30">out</span>}
        {typeof points === "number" && (
          <span className="font-semibold tabular-nums text-white/80">{points}</span>
        )}
      </span>
    </div>
  );
}
