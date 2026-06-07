import Link from "next/link";
import { MemberCard } from "@/components/MemberCard";
import { getLeaderboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const leaderboard = await getLeaderboard();

  if (!leaderboard.length) {
    return (
      <div className="py-20 text-center text-white/60">
        <p className="mb-4">The teams haven&apos;t been drawn yet.</p>
        <Link href="/" className="btn-primary">
          Go to the draw
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="display mb-1 text-3xl">The family</h1>
      <p className="mb-6 text-sm text-white/50">
        Tap a card for that person&apos;s full dashboard.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {leaderboard.map((entry) => (
          <MemberCard key={entry.memberId} entry={entry} />
        ))}
      </div>
    </div>
  );
}
