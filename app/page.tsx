"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle, Link2, Check, Sparkles } from "lucide-react";
import { useMeals } from "@/lib/useMeals";
import { useToast } from "@/components/Toast";
import { countUnownedDocs, claimUnownedDocs } from "@/lib/claim";
import { refreshProfileStats } from "@/lib/firestore";
import { useAuth } from "@/components/AuthProvider";
import { MealTimeline } from "@/components/MealTimeline";
import { RankingsList } from "@/components/RankingsList";
import { TrendChart } from "@/components/TrendChart";
import { Landing } from "@/components/Landing";
import { cn } from "@/lib/utils";

type Tab = "Timeline" | "Rankings" | "Trends";
const TABS: Tab[] = ["Timeline", "Rankings", "Trends"];

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { meals, dishes, isLoading, error, mutate } = useMeals(user?.uid ?? null);
  const [tab, setTab] = useState<Tab>("Timeline");
  const [copied, setCopied] = useState(false);
  const [unowned, setUnowned] = useState(0);
  const [claiming, setClaiming] = useState(false);

  // Detect legacy/imported meals that have no owner yet.
  useEffect(() => {
    if (!user) return;
    countUnownedDocs()
      .then(setUnowned)
      .catch(() => {});
  }, [user, meals.length]);

  const claim = async () => {
    if (!user) return;
    setClaiming(true);
    try {
      const n = await claimUnownedDocs(user.uid);
      await refreshProfileStats(
        user.uid,
        user.displayName || (user.email ?? "").replace(/@.*/, "") || "Me",
        user.email ?? "",
        user.photoURL ?? ""
      ).catch(() => {});
      toast(`Added ${n} imported records to your log.`, "success");
      setUnowned(0);
      await mutate();
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Couldn’t claim records.",
        "error"
      );
    } finally {
      setClaiming(false);
    }
  };

  const shareMyLog = async () => {
    if (!user) return;
    const url = `${window.location.origin}${
      process.env.NEXT_PUBLIC_BASE_PATH ?? ""
    }/u/?id=${encodeURIComponent(user.uid)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Link to your log copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy link.", "error");
    }
  };

  // While auth resolves, avoid flashing the landing page.
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  // Signed out → public landing with sign-up / browse options.
  if (!user) {
    return <Landing />;
  }

  return (
    <div className="space-y-6">
      {/* Header: title + share my log */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">My Dining Log</h1>
          <p className="text-xs text-zinc-500">
            {meals.length} {meals.length === 1 ? "meal" : "meals"} logged
          </p>
        </div>
        <button
          onClick={shareMyLog}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Share my log"}
        </button>
      </div>

      {unowned > 0 && (
        <div className="surface flex flex-col gap-3 border-amber-500/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="font-medium text-zinc-200">
                {unowned} imported records aren’t linked to your account yet.
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Add them to your log so they show up here.
              </p>
            </div>
          </div>
          <button
            onClick={claim}
            disabled={claiming}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-60"
          >
            {claiming && <Loader2 className="h-4 w-4 animate-spin" />}
            {claiming ? "Adding…" : `Add ${unowned} records`}
          </button>
        </div>
      )}

      {/* View tabs */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="tab-active"
                  className="absolute inset-0 rounded-md bg-zinc-800"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{t}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="surface flex flex-col items-center gap-2 p-8 text-center">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <p className="text-sm font-medium text-zinc-200">
            Couldn’t load your meals.
          </p>
          <p className="max-w-md text-xs text-zinc-500">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      ) : isLoading && meals.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
        </div>
      ) : (
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "Timeline" && <MealTimeline meals={meals} dishes={dishes} />}
          {tab === "Rankings" && <RankingsList dishes={dishes} />}
          {tab === "Trends" && <TrendChart meals={meals} />}
        </motion.div>
      )}
    </div>
  );
}
