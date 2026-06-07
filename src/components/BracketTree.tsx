import { ROUND_LABELS } from "@/lib/theme";

export interface BracketSlot {
  name: string | null;
  flag: string | null;
  owner?: { memberName: string; accentColor: string };
  isWinner?: boolean;
}

export interface BracketMatch {
  id: string;
  home: BracketSlot;
  away: BracketSlot;
  homeGoals: number | null;
  awayGoals: number | null;
  played: boolean;
}

export interface BracketRound {
  ord: number;
  matches: BracketMatch[];
}

function Slot({ slot, score }: { slot: BracketSlot; score: number | null }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 ${
        slot.isWinner ? "bg-white/10" : ""
      }`}
      style={
        slot.owner
          ? { borderLeft: `3px solid ${slot.owner.accentColor}` }
          : { borderLeft: "3px solid transparent" }
      }
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span>{slot.flag ?? "🏳️"}</span>
        <span className={`truncate text-xs ${slot.isWinner ? "font-semibold" : "text-white/70"}`}>
          {slot.name ?? "TBD"}
        </span>
      </span>
      {score != null && <span className="text-xs tabular-nums text-white/80">{score}</span>}
    </div>
  );
}

export function BracketTree({ rounds }: { rounds: BracketRound[] }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {rounds.map((r) => (
          <div key={r.ord} className="flex w-44 flex-col">
            <div className="display mb-2 text-center text-xs text-white/50">
              {ROUND_LABELS[r.ord]}
            </div>
            <div className="flex flex-1 flex-col justify-around gap-2">
              {r.matches.map((m) => (
                <div key={m.id} className="card space-y-1 p-1.5">
                  <Slot slot={m.home} score={m.played ? m.homeGoals : null} />
                  <Slot slot={m.away} score={m.played ? m.awayGoals : null} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
