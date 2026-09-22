"use client";

import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Navbar } from "./Navbar";
import { DemoBanner } from "./DemoBanner";

/**
 * Single-owner site: everything is publicly viewable, no login required.
 * The owner signs in only to add/edit ratings (gated inside components).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { configured, loading } = useAuth();

  if (configured && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <DemoBanner />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-zinc-600 sm:px-6">
        Dining Log · Penn State dining, tracked honestly.
      </footer>
    </>
  );
}
