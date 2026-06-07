import { prisma } from "@/lib/db";
import { applySnapshot } from "@/lib/sync";
import { getSnapshotSafe } from "@/lib/providers";
import { FAMILY_MEMBERS } from "@/lib/theme";

// Idempotent seed: 6 family members + the 48 teams / 104 fixtures snapshot.
// Does NOT perform the draw — that is a deliberate one-time action in the app.
async function main() {
  console.log("Seeding family members…");
  for (let i = 0; i < FAMILY_MEMBERS.length; i++) {
    const m = FAMILY_MEMBERS[i];
    await prisma.member.upsert({
      where: { name: m.name },
      create: { name: m.name, accentColor: m.accentColor, sortOrder: i },
      update: { accentColor: m.accentColor, sortOrder: i },
    });
  }

  console.log("Seeding teams + fixtures (real 2026 schedule)…");
  const { snapshot, usedFallback } = await getSnapshotSafe();
  const result = await applySnapshot(snapshot);
  console.log(
    `Seeded ${result.teams} teams and ${result.matches} matches from "${snapshot.source}"${
      usedFallback ? " (network unavailable — used bundled real schedule)" : ""
    }.`,
  );

  const drawExists = await prisma.draw.findFirst();
  console.log(
    drawExists
      ? "A draw already exists — leaving it untouched."
      : "No draw yet — run it once from the app or /admin.",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
