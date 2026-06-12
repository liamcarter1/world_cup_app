import { AdminPanel } from "@/components/AdminPanel";
import { getDrawStatus } from "@/lib/queries";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { draw } = await getDrawStatus();
  const requiresPassword = !!process.env.ADMIN_PASSWORD;
  const lastSync = await prisma.syncLog.findFirst({ orderBy: { fetchedAt: "desc" } });
  const [teamCount, matchCount] = await Promise.all([
    prisma.team.count(),
    prisma.match.count(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="display text-3xl">Admin</h1>

      <section className="card p-5">
        <h2 className="display mb-3 text-lg">Status</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-white/50">Draw</dt>
          <dd>
            {draw ? (
              <span className="text-wc-green">
                Locked ✓ — {new Date(draw.createdAt).toLocaleString()}
              </span>
            ) : (
              <span className="text-wc-gold">Not drawn yet</span>
            )}
          </dd>
          {draw && (
            <>
              <dt className="text-white/50">Draw seed</dt>
              <dd className="font-mono text-xs text-white/70">{draw.seed}</dd>
            </>
          )}
          <dt className="text-white/50">Teams / matches</dt>
          <dd>
            {teamCount} / {matchCount}
          </dd>
          <dt className="text-white/50">Live data source</dt>
          <dd>ESPN (free live scores) · schedule from openfootball</dd>
          <dt className="text-white/50">Last sync</dt>
          <dd>
            {lastSync
              ? `${lastSync.source} · ${new Date(lastSync.fetchedAt).toLocaleString()}`
              : "never"}
          </dd>
        </dl>
      </section>

      <section className="card p-5">
        <h2 className="display mb-1 text-lg">Update scores</h2>
        <p className="mb-3 text-xs text-white/50">
          Pulls the latest scores/results from ESPN and recomputes the leaderboard.
        </p>
        <AdminPanel requiresPassword={requiresPassword} />
      </section>

      <section className="card p-5 text-sm text-white/60">
        <h2 className="display mb-2 text-lg text-white">The draw is one-time</h2>
        <p>
          The random draw can only be run once and is permanently locked for fairness. The stored
          seed above lets anyone verify it wasn&apos;t tampered with. To start completely over (e.g.
          before the tournament), reset the database with <code>npm run db:reset</code>.
        </p>
      </section>
    </div>
  );
}
