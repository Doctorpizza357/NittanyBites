"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Edit2, Loader2, Search, Trash2 } from "lucide-react";
import type { DishRating } from "@/lib/types";
import { cn, normalizeCommons, scoreAccent } from "@/lib/utils";
import { deleteDish } from "@/lib/firestore";
import { useAuth } from "./AuthProvider";
import { useMeals } from "@/lib/useMeals";
import { useToast } from "./Toast";
import { isOwnerUid } from "@/lib/firebase";
import { EditDishModal } from "./EditDishModal";

const RANK_COLOR = ["text-amber-300", "text-zinc-300", "text-orange-400"];

interface RankedDish {
  dish: DishRating;
  average: number;
  count: number;
  low: number;
  high: number;
}

export function RankingsList({ dishes }: { dishes: DishRating[] }) {
  const { user } = useAuth();
  const { mutate } = useMeals();
  const { toast } = useToast();
  const [editing, setEditing] = useState<DishRating | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [location, setLocation] = useState("All locations");
  const isOwner = isOwnerUid(user?.uid);
  const categories = Array.from(new Set(dishes.map((dish) => dish.category).filter(Boolean))).sort();
  const locations = Array.from(new Set(dishes.map((dish) => normalizeCommons(dish.location)))).sort();
  const ranked = useMemo(() => {
    const matching = dishes.filter((dish) =>
      dish.dish.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
      (category === "All categories" || dish.category === category) &&
      (location === "All locations" || normalizeCommons(dish.location) === location)
    );
    const groups = new Map<string, DishRating[]>();
    for (const dish of matching) {
      const key = dish.dish.trim().toLocaleLowerCase();
      const group = groups.get(key) ?? [];
      group.push(dish);
      groups.set(key, group);
    }
    return Array.from(groups.values()).map((reviews): RankedDish => {
      const latest = [...reviews].sort((a, b) => b.date.localeCompare(a.date))[0];
      const ratings = reviews.map((review) => review.rating);
      return {
        dish: latest,
        average: ratings.reduce((total, rating) => total + rating, 0) / ratings.length,
        count: ratings.length,
        low: Math.min(...ratings),
        high: Math.max(...ratings),
      };
    }).sort((a, b) => b.average - a.average);
  }, [dishes, search, category, location]);

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

  if (dishes.length === 0) {
    return (
      <div className="surface p-10 text-center text-sm text-zinc-500">
        No dishes ranked yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(12rem,1fr)_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input aria-label="Search dishes" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dishes" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-base text-zinc-100 outline-none focus:border-zinc-600 sm:text-sm" />
        </label>
        <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-base text-zinc-300 sm:text-sm">
          <option>All categories</option>
          {categories.map((option) => <option key={option}>{option}</option>)}
        </select>
        <select aria-label="Filter by location" value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-base text-zinc-300 sm:text-sm">
          <option>All locations</option>
          {locations.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>
      {ranked.length === 0 ? <div className="surface p-8 text-center text-sm text-zinc-500">No dishes match these filters.</div> : ranked.map((entry, i) => {
        const d = entry.dish;
        return (
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
                <span className={cn("rounded-md border px-2 py-0.5 font-mono text-sm font-semibold tabular-nums", scoreAccent(entry.average))}>
                  {entry.average.toFixed(1)}
                </span>
              </div>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {normalizeCommons(d.location)} · {d.category} · {entry.count} {entry.count === 1 ? "review" : "reviews"}
            </p>
            {entry.count > 1 && <p className="mt-1 text-xs text-zinc-600">Scores {entry.low.toFixed(1)}–{entry.high.toFixed(1)}</p>}
            {d.notes && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {d.notes}
              </p>
            )}
          </div>
        </motion.div>
      ); })}
      <EditDishModal dish={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
