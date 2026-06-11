import type { DisplayStatus } from "@/lib/theme";

// Status chip driven by the computed display status (clock-aware).
export function StatusPill({ ds }: { ds: DisplayStatus }) {
  if (ds === "live" || ds === "inplay") {
    return (
      <span className="chip bg-wc-red/20 text-wc-red ring-1 ring-wc-red/40">
        <span className="h-2 w-2 animate-pulse-live rounded-full bg-wc-red" />
        {ds === "live" ? "LIVE" : "IN PLAY"}
      </span>
    );
  }
  if (ds === "ft") {
    return <span className="chip bg-white/10 text-white/60">FT</span>;
  }
  if (ds === "await") {
    return <span className="chip bg-wc-gold/15 text-wc-gold">Result soon</span>;
  }
  return <span className="chip bg-wc-sky/15 text-wc-sky">Upcoming</span>;
}
