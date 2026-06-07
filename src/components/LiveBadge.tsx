import { liveStatus, finishedStatus } from "@/lib/theme";

export function StatusPill({ status }: { status: string }) {
  if (liveStatus(status)) {
    return (
      <span className="chip bg-wc-red/20 text-wc-red ring-1 ring-wc-red/40">
        <span className="h-2 w-2 animate-pulse-live rounded-full bg-wc-red" />
        LIVE
      </span>
    );
  }
  if (finishedStatus(status)) {
    return <span className="chip bg-white/10 text-white/60">FT</span>;
  }
  if (status === "NS") {
    return <span className="chip bg-wc-sky/15 text-wc-sky">Upcoming</span>;
  }
  return <span className="chip bg-white/10 text-white/60">{status}</span>;
}
