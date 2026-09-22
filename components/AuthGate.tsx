"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { LoginScreen } from "./LoginScreen";
import { Navbar } from "./Navbar";
import { DemoBanner } from "./DemoBanner";

// Routes that are viewable WITHOUT signing in.
// "/" is public (shows a landing view when signed out).
const PUBLIC_PREFIXES = ["/", "/people", "/u"];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p))
  );
}

/**
 * Gates the app behind Firebase Auth.
 * - Unconfigured Firebase → demo mode (no login).
 * - Public routes (/people, /u) → always accessible.
 * - Private routes → login screen when signed out.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { configured, loading, user } = useAuth();
  const pathname = usePathname();
  const publicRoute = isPublicPath(pathname);

  // Demo mode (no Firebase config): let people explore with seed data.
  if (!configured) {
    return (
      <>
        <Navbar />
        <DemoBanner />
        <AppShell>{children}</AppShell>
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  // Private route + signed out → require login.
  if (!user && !publicRoute) {
    return <LoginScreen />;
  }

  return (
    <>
      <Navbar />
      <DemoBanner />
      <AppShell>{children}</AppShell>
    </>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-zinc-600 sm:px-6">
        Dining Log · Penn State dining, tracked honestly.
      </footer>
    </>
  );
}
