import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { APP_NAME, APP_TAGLINE } from "@/lib/theme";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "A 2026 FIFA World Cup family sweepstake: random team draw, live scores and a last-team-standing leaderboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <Nav />
          <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">{children}</main>
          <footer className="border-t border-white/10 py-6 text-center text-xs text-white/40">
            {APP_NAME} · {APP_TAGLINE} · prizes are just for fun 🏆
          </footer>
        </div>
      </body>
    </html>
  );
}
