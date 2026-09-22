"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload, Download, LogOut, LogIn, UtensilsCrossed } from "lucide-react";
import { LogMealModal } from "./LogMealModal";
import { ImportModal } from "./ImportModal";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";
import { useMeals } from "@/lib/useMeals";
import { isOwnerUid } from "@/lib/firebase";
import { buildExportPayload } from "@/lib/importSchema";

export function Navbar() {
  const { user, configured, signInWithGoogle, signOut } = useAuth();
  const { toast } = useToast();
  const { meals, dishes } = useMeals();
  const [logOpen, setLogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const isOwner = isOwnerUid(user?.uid);

  const handleExport = () => {
    const payload = buildExportPayload(meals, dishes);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nittany-bites-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${meals.length} meals.`, "success");
  };

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
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <UtensilsCrossed className="h-4 w-4 text-white" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                Dining Log
              </span>
              <span className="mt-0.5 text-xs text-zinc-500">
                Penn State
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            {isOwner ? (
              <>
                <button
                  onClick={handleExport}
                  title="Export all ratings as JSON"
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={() => setImportOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Import</span>
                </button>
                <button
                  onClick={() => setLogOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Log Meal</span>
                </button>
                <button
                  onClick={() => signOut()}
                  title="Sign out"
                  className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-200"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : configured ? (
              // Non-owner: subtle owner sign-in (viewers never need this).
              <button
                onClick={user ? () => signOut() : handleSignIn}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
                title={user ? "Signed in (not owner)" : "Owner sign-in"}
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {user ? "Sign out" : "Owner"}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {isOwner && (
        <>
          <LogMealModal open={logOpen} onClose={() => setLogOpen(false)} />
          <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
        </>
      )}
    </>
  );
}
