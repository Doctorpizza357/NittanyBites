"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Edit2, Loader2, Trash2 } from "lucide-react";
import type { DishRating } from "@/lib/types";
import { cn, normalizeCommons, scoreAccent } from "@/lib/utils";
import { deleteDish } from "@/lib/firestore";
import { useAuth } from "./AuthProvider";
import { useMeals } from "@/lib/useMeals";
import { useToast } from "./Toast";
import { isOwnerUid } from "@/lib/firebase";
import { EditDishModal } from "./EditDishModal";

const RANK_COLOR = ["text-amber-300", "text-zinc-300", "text-orange-400"];

export function RankingsList({ dishes }: { dishes: DishRating[] }) {
  const { user } = useAuth();
  const { mutate } = useMeals();
  const { toast } = useToast();
  const [editing, setEditing] = useState<DishRating | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isOwner = isOwnerUid(user?.uid);
  const ranked = useMemo(() => {
    // Keep the best-rated instance of each dish name.
    const best = new Map<string, DishRating>();
    for (const d of dishes) {
      const existing = best.get(d.dish);
      if (!existing || d.rating > existing.rating) best.set(d.dish, d);
    }
    return Array.from(best.values()).sort((a, b) => b.rating - a.rating);
  }, [dishes]);

  const handleDelete = async (dish: DishRating) => {
    if (!dish.id || !window.confirm(`Delete the ranking for "${dish.dish}"? This can't be undone.`)) return;
    setDeletingId(dish.id);
    try {
      await deleteDish(dish.id);
      await mutate();
      toast("Ranking deleted.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Delete failed.", "error");
    } finally {
      setDeletingId(null);
    }
  };

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
          <span
            className={cn(
              "mt-0.5 w-8 shrink-0 text-right font-mono text-sm font-semibold tabular-nums",
              RANK_COLOR[i] ?? "text-zinc-600"
            )}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="truncate text-sm font-medium text-zinc-100">
                {d.dish}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {isOwner && (
                  <>
                    <button onClick={() => setEditing(d)} title="Edit ranking" className="rounded-md p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(d)} disabled={deletingId === d.id} title="Delete ranking" className="rounded-md p-1 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50">
                      {deletingId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </>
                )}
                <span className={cn("rounded-md border px-2 py-0.5 font-mono text-sm font-semibold tabular-nums", scoreAccent(d.rating))}>
                  {d.rating.toFixed(1)}
                </span>
              </div>
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
      <EditDishModal dish={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
