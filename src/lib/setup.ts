import { prisma } from "@/lib/db";
import { applySnapshot } from "@/lib/sync";
import { getSnapshotSafe } from "@/lib/providers";
import { FAMILY_MEMBERS } from "@/lib/theme";

// Idempotent: seeds the 6 family members + the real 48 teams / 104 fixtures.
// Does NOT perform the draw — that stays a deliberate one-time action.
export async function seedDatabase() {
  for (let i = 0; i < FAMILY_MEMBERS.length; i++) {
    const m = FAMILY_MEMBERS[i];
    await prisma.member.upsert({
      where: { name: m.name },
      create: { name: m.name, accentColor: m.accentColor, sortOrder: i },
      update: { accentColor: m.accentColor, sortOrder: i },
    });
  }

  const { snapshot, usedFallback } = await getSnapshotSafe();
  const result = await applySnapshot(snapshot);
  const drawExists = await prisma.draw.findFirst();

  return {
    members: FAMILY_MEMBERS.length,
    teams: result.teams,
    matches: result.matches,
    source: snapshot.source,
    usedFallback,
    drawExists: !!drawExists,
  };
}
