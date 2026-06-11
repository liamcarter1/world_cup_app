import { StatusPill } from "./LiveBadge";
import { Countdown } from "./Countdown";
import { displayStatus } from "@/lib/theme";

export interface FixtureRowData {
  id: string;
  round: string;
  kickoff: Date | string;
  venue: string | null;
  status: string;
  homeName: string | null;
  homeFlag: string | null;
  awayName: string | null;
  awayFlag: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homeOwner?: { memberName: string; accentColor: string };
  awayOwner?: { memberName: string; accentColor: string };
}

function Side({
  name,
  flag,
  owner,
  align,
}: {
  name: string | null;
  flag: string | null;
  owner?: { memberName: string; accentColor: string };
  align: "left" | "right";
}) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <span className="shrink-0 text-xl">{flag ?? "🏳️"}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name ?? "TBD"}</div>
        {owner && (
          <div
            className="truncate text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: owner.accentColor }}
          >
            {owner.memberName}
          </div>
        )}
      </div>
    </div>
  );
}

export function FixtureRow({ m }: { m: FixtureRowData }) {
  const ds = displayStatus(m.status, m.kickoff);
  const showScore = ds === "ft" || ds === "live";
  return (
    <div className="card flex items-center gap-3 px-3 py-2.5">
      <Side name={m.homeName} flag={m.homeFlag} owner={m.homeOwner} align="left" />
      <div className="flex w-24 shrink-0 flex-col items-center gap-0.5">
        {showScore ? (
          <span className="display text-xl tabular-nums">
            {m.homeGoals ?? 0}–{m.awayGoals ?? 0}
          </span>
        ) : ds === "upcoming" ? (
          <span className="text-xs text-white/50">
            <Countdown to={m.kickoff} />
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wide text-white/40">
            {ds === "inplay" ? "underway" : "awaiting"}
          </span>
        )}
        <StatusPill ds={ds} />
      </div>
      <Side name={m.awayName} flag={m.awayFlag} owner={m.awayOwner} align="right" />
    </div>
  );
}
