"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { wrappedTheme } from "@/lib/theme";

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function AppHeader(props: {
  isAuthed: boolean;
  isAdmin?: boolean;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const baseLinks = props.isAuthed
    ? [
        { href: "/", label: "My Vibed" },
        { href: "/repos", label: "Repos" },
        { href: "/analysis", label: "Reports" },
        { href: "/security", label: "Security" },
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/security", label: "Security" },
      ];

  const links = props.isAdmin
    ? [...baseLinks, { href: "/admin", label: "Admin" }]
    : baseLinks;

  return (
    <header className="sticky top-0 z-50 bg-white/75 backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-500" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-amber-400 via-fuchsia-500 to-cyan-500 opacity-70" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-20">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="group flex items-center gap-2"
          >
            <span className={wrappedTheme.dot} />
            <span className="text-lg font-bold tracking-tight text-zinc-950">
              Vibed Coding
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {links.map((l) => {
              const isActive = isActiveLink(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    isActive
                      ? "relative rounded-full bg-gradient-to-r from-fuchsia-500/15 via-indigo-500/15 to-cyan-500/15 px-4 py-1.5 font-semibold text-zinc-950"
                      : wrappedTheme.pillLink
                  }
                >
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-[17px] mx-auto h-0.5 w-8 rounded-full bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-500" />
                  )}
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {props.isAuthed ? (
            <form action={props.signOut}>
              <button
                type="submit"
                className="rounded-full border border-zinc-300/80 bg-white/70 px-4 py-1.5 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur transition hover:border-zinc-400 hover:bg-white"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
