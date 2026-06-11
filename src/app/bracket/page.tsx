import { BracketTree } from "@/components/BracketTree";
import { getFixtures, getOwnerMap } from "@/lib/queries";
import { buildBracket } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const [owners, fixtures] = await Promise.all([getOwnerMap(), getFixtures()]);
  const knockout = fixtures.filter((m) => m.roundOrd >= 1);
  const rounds = buildBracket(knockout, owners);

  // Unique member -> accent legend (only meaningful once a draw exists).
  const legend = Array.from(
    new Map(
      Array.from(owners.values()).map((o) => [o.memberName, o.accentColor]),
    ).entries(),
  ).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-3xl">Knockout Stage</h1>
        <p className="text-sm text-white/50">
          Slots are tinted by the family member who owns each team — watch the colours advance.
        </p>
      </div>

      {legend.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-white/60">
          {legend.map(([name, color]) => (
            <span key={name} className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm" style={{ background: color }} /> {name}
            </span>
          ))}
        </div>
      )}

      <div className="card p-4">
        <BracketTree rounds={rounds} />
      </div>
      <p className="text-xs text-white/40">
        Knockout slots fill in automatically as the live results come through.
      </p>
    </div>
  );
}
