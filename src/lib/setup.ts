import { prisma } from "@/lib/db";
import { applySnapshot } from "@/lib/sync";
import { getSnapshotSafe } from "@/lib/providers";
import { FAMILY_MEMBERS } from "@/lib/theme";

// Idempotent: seeds the 6 family members + the real 48 teams / 104 fixtures.
// Does NOT perform the draw — that stays a deliberate one-time action.
//
// On an empty database it uses bulk createMany (a few queries) so it finishes
// well within the serverless time limit; on re-runs it falls back to upserts.
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
  const teamCount = await prisma.team.count();

  if (teamCount === 0) {
    // Fast path: no fixtures played yet, so cached scoring fields are all defaults.
    await prisma.team.createMany({
      data: snapshot.teams.map((t) => ({
        externalId: t.externalId,
        name: t.name,
        code: t.code,
        flag: t.flag,
        groupName: t.groupName,
      })),
      skipDuplicates: true,
    });
    const dbTeams = await prisma.team.findMany();
    const idByExternal = new Map(dbTeams.map((t) => [t.externalId, t.id]));
    await prisma.match.createMany({
      data: snapshot.fixtures.map((f) => ({
        externalId: f.externalId,
        round: f.round,
        roundOrd: f.roundOrd,
        groupName: f.groupName,
        kickoff: new Date(f.kickoff),
        venue: f.venue,
        status: f.status,
        homeTeamId: f.homeExternalId ? idByExternal.get(f.homeExternalId) ?? null : null,
        awayTeamId: f.awayExternalId ? idByExternal.get(f.awayExternalId) ?? null : null,
        homeGoals: f.homeGoals,
        awayGoals: f.awayGoals,
        winnerTeamId: f.winnerExternalId ? idByExternal.get(f.winnerExternalId) ?? null : null,
      })),
      skipDuplicates: true,
    });
  } else {
    // Re-run: upsert everything and recompute cached scoring.
    await applySnapshot(snapshot);
  }

  const [teams, matches, drawExists] = await Promise.all([
    prisma.team.count(),
    prisma.match.count(),
    prisma.draw.findFirst(),
  ]);

  return {
    members: FAMILY_MEMBERS.length,
    teams,
    matches,
    source: snapshot.source,
    usedFallback,
    drawExists: !!drawExists,
  };
}
