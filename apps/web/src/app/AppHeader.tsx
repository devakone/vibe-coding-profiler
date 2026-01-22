"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { wrappedTheme } from "@/lib/theme";
import { NotificationDropdown } from "@/components/notifications";

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  // For settings, match any /settings/* path
  if (href.startsWith("/settings")) return pathname.startsWith("/settings");
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
        { href: "/", label: "My VCP" },
        { href: "/vibes", label: "Repo VCPs" },
        { href: "/settings/repos", label: "Settings" },
        { href: "/methodology", label: "Methodology" },
        { href: "/security", label: "Security" },
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/methodology", label: "Methodology" },
        { href: "/security", label: "Security" },
      ];

  const links = props.isAdmin
    ? [...baseLinks, { href: "/admin", label: "Admin" }]
    : baseLinks;

  return (
    <header className="sticky top-0 z-50 bg-white/75 backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-500 to-indigo-500" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-400 opacity-50" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-20">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="group flex items-center gap-2"
          >
            <span className={wrappedTheme.dot} />
            <span className="text-lg font-bold tracking-tight text-zinc-950">
              Vibe Coding Profile
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
                      ? "relative rounded-full bg-violet-100 px-4 py-1.5 font-semibold text-violet-900"
                      : wrappedTheme.pillLink
                  }
                >
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-[17px] mx-auto h-0.5 w-8 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
                  )}
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {props.isAuthed ? (
            <>
              <NotificationDropdown />
              <form action={props.signOut}>
                <button
                  type="submit"
                  className="rounded-full border border-zinc-300/80 bg-white/70 px-4 py-1.5 text-sm font-semibold text-zinc-950 shadow-sm backdrop-blur transition hover:border-zinc-400 hover:bg-white"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
