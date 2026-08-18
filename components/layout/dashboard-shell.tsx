import Link from "next/link";
import Image from "next/image";
import { DashboardNav } from "@/components/navigation/dashboard-nav";
import { signOutAction } from "@/lib/auth/sign-out-action";

interface DashboardShellProps {
  children: React.ReactNode;
  /** Signed-in user's email, for the "kim olarak giriş yapıldı" line. */
  userEmail: string | null;
  /**
   * `true` for a platform admin (sees every customer), `false` for a
   * customer user. Drives both the "kim olarak giriş yapıldı" label and
   * (as of Phase 3) which nav links are shown — see DashboardNav.
   */
  isAdmin: boolean;
}

/**
 * Structural shell for every `/dashboard/*` route: a persistent top
 * header (brand + signed-in user + sign out — matches the Phase 4
 * mockup's "MB Digital Boost ... Bilal ▼" bar) with a sidebar below it on
 * desktop. On mobile the sidebar collapses into a horizontally-scrollable
 * nav strip right under the header instead of a second duplicate header,
 * so there's exactly one place sign-out lives regardless of viewport.
 *
 * Rendering this at all already implies an authenticated session —
 * `app/dashboard/layout.tsx` calls `requireSession()` before this
 * component ever mounts, so there's no "logged out" state to handle here.
 */
export function DashboardShell({ children, userEmail, isAdmin }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/10 bg-background px-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Image
            src="/images/mb-digital-boost/mb-mark.png"
            alt=""
            width={22}
            height={22}
            className="shrink-0"
          />
          <span>MB Digital Boost</span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-foreground/60">
          {userEmail ? (
            <span className="hidden truncate sm:inline" title={userEmail}>
              {userEmail}
              <span className="ml-1.5 rounded-full bg-brand-accent/10 px-2 py-0.5 font-medium text-brand-accent">
                {isAdmin ? "Admin" : "Müşteri"}
              </span>
            </span>
          ) : null}
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
            >
              Çıkış Yap
            </button>
          </form>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-black/10 p-4 md:block">
          <DashboardNav isAdmin={isAdmin} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-black/10 px-4 py-2 md:hidden">
            <DashboardNav
              isAdmin={isAdmin}
              className="flex gap-1 overflow-x-auto [scrollbar-width:none]"
            />
          </div>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
