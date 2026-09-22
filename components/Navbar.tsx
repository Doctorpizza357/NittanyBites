"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Users, LayoutDashboard, LogOut, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogMealModal } from "./LogMealModal";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";

export function Navbar() {
  const pathname = usePathname();
  const { user, configured, signInWithGoogle, signOut } = useAuth();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const initials = (() => {
    const name = user?.displayName || user?.email || "";
    if (!name) return "?";
    const parts = name.replace(/@.*/, "").split(/[.\s_]+/).filter(Boolean);
    return (
      (parts[0]?.[0] ?? "").concat(parts[1]?.[0] ?? "").toUpperCase() ||
      name[0].toUpperCase()
    );
  })();

  const onPeople = pathname?.startsWith("/people") || pathname?.startsWith("/u");
  const onHome = pathname === "/";

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sign-in failed.", "error");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              Dining Log
            </span>
            <span className="mt-0.5 text-xs text-zinc-500">
              Penn State · West &amp; South
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className={cn(
                "hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors sm:flex",
                onHome
                  ? "bg-zinc-800/60 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              {user ? "My Log" : "Home"}
            </Link>

            <Link
              href="/people"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                onPeople
                  ? "bg-zinc-800/60 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              <Users className="h-4 w-4" />
              People
            </Link>

            {configured && user ? (
              <>
                <button
                  onClick={() => setModalOpen(true)}
                  className="ml-1 flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Log Meal</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <div
                    title={user.email ?? undefined}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xs font-medium text-zinc-300"
                  >
                    {initials}
                  </div>
                  <button
                    onClick={() => signOut()}
                    title="Sign out"
                    className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : configured ? (
              <button
                onClick={handleSignIn}
                className="ml-1 flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <LogMealModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
