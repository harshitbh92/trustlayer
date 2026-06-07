"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { useMessagesPanel } from "@/lib/messages-panel-context";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/feed", label: "Feed" },
  { href: "/discover", label: "Discover" },
  { href: "/random", label: "Random Chat" },
  { href: "/connections", label: "Connections" },
];

export function TopBar() {
  const { signedIn, user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const { isOpen: messagesOpen, openInbox } = useMessagesPanel();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={signedIn ? "/feed" : "/"} className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-semibold tracking-tight">TrustLayer</span>
        </Link>

        {signedIn && (
          <nav className="hidden gap-1 sm:flex">
            {NAV.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "rounded-lg px-3 py-1.5 text-sm transition",
                    active
                      ? "bg-surface-elevated text-foreground"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={openInbox}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm transition",
                messagesOpen || pathname?.startsWith("/messages")
                  ? "bg-surface-elevated text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              Messages
            </button>
            {user?.role === "ADMIN" ? (
              <Link
                href="/admin"
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-sm transition",
                  pathname?.startsWith("/admin")
                    ? "bg-rose-500/20 text-rose-700 dark:text-rose-200"
                    : "text-muted hover:text-foreground",
                )}
              >
                Admin
              </Link>
            ) : null}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {loading ? null : signedIn ? (
            <>
              {user?.username && (
                <Link
                  href={`/profile/${user.username}`}
                  className="text-sm text-muted hover:text-foreground"
                >
                  @{user.username}
                </Link>
              )}
              <button
                onClick={signOut}
                className="text-sm text-muted hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary text-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
