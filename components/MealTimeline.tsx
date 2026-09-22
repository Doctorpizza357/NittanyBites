"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { MealLog, DishRating } from "@/lib/types";
import { cn, normalizeCommons, normalizeMeal } from "@/lib/utils";

interface Props {
  meals: MealLog[];
  dishes: DishRating[];
}

const LOCATION_FILTERS = ["All", "Waring Commons", "Redifer Commons"];
const MEAL_FILTERS = ["All", "Lunch", "Dinner"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function MealTimeline({ meals, dishes }: Props) {
  const [loc, setLoc] = useState("All");
  const [mealType, setMealType] = useState("All");

  const filtered = useMemo(() => {
    return meals
      .filter((m) => {
        if (loc !== "All" && normalizeCommons(m.location) !== loc) return false;
        if (mealType !== "All") {
          const b = normalizeMeal(m.meal);
          if (mealType === "Lunch" && b === "Dinner") return false;
          if (mealType === "Dinner" && b !== "Dinner") return false;
        }
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [meals, loc, mealType]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup options={LOCATION_FILTERS} value={loc} onChange={setLoc} />
        <span className="mx-1 hidden h-4 w-px bg-zinc-800 sm:block" />
        <FilterGroup options={MEAL_FILTERS} value={mealType} onChange={setMealType} />
      </div>

      {filtered.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-zinc-500">
          No meals match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((meal, i) => (
            <MealEntry
              key={`${meal.date}-${meal.meal}-${i}`}
              meal={meal}
              dishes={dishes}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            value === opt
              ? "bg-zinc-100 text-zinc-900"
              : "border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function MealEntry({
  meal,
  dishes,
  index,
}: {
  meal: MealLog;
  dishes: DishRating[];
  index: number;
}) {
  // Match dishes to this meal by date + meal label.
  const mealDishes = dishes
    .filter((d) => d.date === meal.date && d.meal === meal.meal)
    .sort((a, b) => b.rating - a.rating);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="surface p-5"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-zinc-100">
            {formatDate(meal.date)}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {meal.meal} · {meal.location}
          </p>
        </div>
        <span className="score shrink-0">{meal.rating.toFixed(1)}</span>
      </header>

      {meal.notes && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{meal.notes}</p>
      )}

      {mealDishes.length > 0 && (
        <p className="mt-3 border-t border-zinc-800/70 pt-3 text-xs leading-relaxed text-zinc-500">
          {mealDishes.map((d, idx) => (
            <span key={`${d.dish}-${idx}`}>
              {idx > 0 && <span className="text-zinc-700"> · </span>}
              <span className="text-zinc-300">{d.dish}</span>{" "}
              <span className="font-mono tabular-nums text-zinc-400">
                {d.rating.toFixed(1)}
              </span>
            </span>
          ))}
        </p>
      )}
    </motion.article>
  );
}
