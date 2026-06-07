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
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <Link href="/" className="flex shrink-0 items-center gap-1.5">
          <span className="text-xl sm:text-2xl">🏆</span>
          <span className="display whitespace-nowrap text-sm leading-none text-white sm:text-xl">
            {APP_NAME}
          </span>
        </Link>
        <nav className="-mr-1 flex items-center gap-0.5 overflow-x-auto text-xs sm:gap-1 sm:text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium transition-colors sm:px-3 ${
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
