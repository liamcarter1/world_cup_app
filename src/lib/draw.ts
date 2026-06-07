import { prisma } from "@/lib/db";

// Small seedable PRNG so a draw is reproducible/auditable from its stored seed.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates shuffle driven by a seeded RNG (uniform permutation).
export function seededShuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function seedToInt(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface DrawResult {
  drawId: string;
  seed: string;
  createdAt: Date;
}

// Perform the ONE-TIME, fair draw. Throws if a draw already exists or counts are wrong.
export async function performDraw(): Promise<DrawResult> {
  const existing = await prisma.draw.findFirst();
  if (existing) {
    throw new Error("A draw already exists — the draw is one-time only.");
  }

  const members = await prisma.member.findMany({ orderBy: { sortOrder: "asc" } });
  const teams = await prisma.team.findMany();

  if (members.length !== 6) {
    throw new Error(`Expected 6 family members, found ${members.length}.`);
  }
  if (teams.length !== 48) {
    throw new Error(`Expected 48 teams, found ${teams.length}.`);
  }

  const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const rng = mulberry32(seedToInt(seed));
  const shuffled = seededShuffle(teams, rng);

  const perMember = shuffled.length / members.length; // 8
  const assignmentsData = members.flatMap((member, mi) =>
    shuffled
      .slice(mi * perMember, mi * perMember + perMember)
      .map((team) => ({ memberId: member.id, teamId: team.id })),
  );

  // Atomic: the Draw + all 48 assignments commit together, or nothing does.
  const draw = await prisma.$transaction(async (tx) => {
    // Race guard: the singleton unique column blocks a second concurrent draw.
    const created = await tx.draw.create({
      data: { seed, locked: true, singleton: 1 },
    });
    await tx.assignment.createMany({
      data: assignmentsData.map((a) => ({ ...a, drawId: created.id })),
    });
    return created;
  });

  return { drawId: draw.id, seed: draw.seed, createdAt: draw.createdAt };
}

export async function getDraw() {
  return prisma.draw.findFirst();
}
