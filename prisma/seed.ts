import { prisma } from "@/lib/db";
import { seedDatabase } from "@/lib/setup";

// Seeds 6 family members + the real 48 teams / 104 fixtures. No draw (one-time in app).
async function main() {
  console.log("Seeding family members, teams and fixtures…");
  const r = await seedDatabase();
  console.log(
    `Seeded ${r.members} members, ${r.teams} teams, ${r.matches} matches from "${r.source}"${
      r.usedFallback ? " (network unavailable — used bundled real schedule)" : ""
    }.`,
  );
  console.log(r.drawExists ? "A draw already exists — left untouched." : "No draw yet.");
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
