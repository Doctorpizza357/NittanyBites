"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { UtensilsCrossed, Users, LogIn, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";

export function Landing() {
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sign-in failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-12 text-center sm:py-20"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
        <UtensilsCrossed className="h-7 w-7 text-zinc-300" />
      </div>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
        Penn State dining, tracked honestly.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
        Log every meal, rate the dishes, and build your own dining timeline.
        Browse what other people are rating across West &amp; South.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleSignIn}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          Create an account to log meals
        </button>
        <Link
          href="/people"
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60"
        >
          <Users className="h-4 w-4" />
          Browse other people
        </Link>
      </div>

      <p className="mt-6 text-xs text-zinc-600">
        No account needed to look around.
      </p>
    </motion.div>
  );
}
