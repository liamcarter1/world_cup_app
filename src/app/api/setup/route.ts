import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { seedDatabase } from "@/lib/setup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-time (idempotent) initialisation for the hosted database: seeds members,
// teams and fixtures. Protected by a secret. Safe to call again (upserts only).
export async function GET(request: Request) {
  const secret = process.env.SETUP_SECRET ?? process.env.ADMIN_PASSWORD;
  const url = new URL(request.url);
  const auth = request.headers.get("authorization");
  const provided = url.searchParams.get("secret") ?? auth?.replace(/^Bearer\s+/i, "");

  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await seedDatabase();
    for (const p of ["/", "/members", "/bracket", "/fixtures", "/admin"]) {
      revalidatePath(p);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "setup failed" },
      { status: 500 },
    );
  }
}
