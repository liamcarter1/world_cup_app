"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/theme";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/members", label: "Family" },
  { href: "/bracket", label: "Bracket" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-wc-charcoal/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <span className="display text-lg leading-none text-white sm:text-xl">
            {APP_NAME}
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  active ? "bg-wc-gold text-wc-charcoal" : "text-white/70 hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="h-1 w-full bg-wc-stripe" />
    </header>
  );
}
