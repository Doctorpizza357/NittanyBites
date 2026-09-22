"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle } from "lucide-react";
import { useMeals } from "@/lib/useMeals";
import { MealTimeline } from "@/components/MealTimeline";
import { RankingsList } from "@/components/RankingsList";
import { TrendChart } from "@/components/TrendChart";
import { cn, round1 } from "@/lib/utils";

type Tab = "Timeline" | "Rankings" | "Trends";
const TABS: Tab[] = ["Timeline", "Rankings", "Trends"];

export default function DashboardPage() {
  const { meals, dishes, isLoading, error } = useMeals();
  const [tab, setTab] = useState<Tab>("Timeline");

  const avg =
    meals.length > 0
      ? round1(meals.reduce((a, m) => a + m.rating, 0) / meals.length)
      : 0;

  return (
    <div className="space-y-6">
      {/* Public header */}
      <div className="flex flex-col items-center text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
          Nittany <span className="text-blue-400">Bites</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {meals.length} {meals.length === 1 ? "meal" : "meals"} logged
          {meals.length > 0 && (
            <>
              {" · "}
              <span className="font-mono tabular-nums text-zinc-200">
                {avg.toFixed(1)}
              </span>{" "}
              average
            </>
          )}
        </p>
      </div>

      {/* View tabs */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab === t && (
                <motion.span
                  layoutId="tab-active"
                  className="absolute inset-0 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{t}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-amber-400" />
          <p className="mt-2 text-sm font-medium text-zinc-200">
            Couldn’t load ratings.
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500">
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
