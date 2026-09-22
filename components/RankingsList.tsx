"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { DishRating } from "@/lib/types";
import { normalizeCommons } from "@/lib/utils";

export function RankingsList({ dishes }: { dishes: DishRating[] }) {
  const ranked = useMemo(() => {
    // Keep the best-rated instance of each dish name.
    const best = new Map<string, DishRating>();
    for (const d of dishes) {
      const existing = best.get(d.dish);
      if (!existing || d.rating > existing.rating) best.set(d.dish, d);
    }
    return Array.from(best.values()).sort((a, b) => b.rating - a.rating);
  }, [dishes]);

  if (ranked.length === 0) {
    return (
      <div className="surface p-10 text-center text-sm text-zinc-500">
        No dishes ranked yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {ranked.map((d, i) => (
        <motion.div
          key={`${d.dish}-${i}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.03, 0.3) }}
          className="surface flex items-start gap-4 p-4"
        >
          <span className="mt-0.5 w-8 shrink-0 text-right font-mono text-sm tabular-nums text-zinc-600">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="truncate text-sm font-medium text-zinc-100">
                {d.dish}
              </h3>
              <span className="score shrink-0">{d.rating.toFixed(1)}</span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {normalizeCommons(d.location)} · {d.category}
            </p>
            {d.notes && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {d.notes}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
