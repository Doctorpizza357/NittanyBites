"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Search, SlidersHorizontal } from "lucide-react";
import type { DishRating } from "@/lib/types";
import { cn, normalizeCommons, normalizeMeal, scoreAccent } from "@/lib/utils";
import { useMeals } from "@/lib/useMeals";

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function matchesSearch(value: string, search: string): boolean {
  return value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

export default function ArchivePage() {
  const { meals, dishes, isLoading, error } = useMeals();
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [mealType, setMealType] = useState("All");
  const [location, setLocation] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const locations = useMemo(
    () => Array.from(new Set(meals.map((meal) => normalizeCommons(meal.location)))).sort(),
    [meals]
  );

  const entries = useMemo(() => {
    const dishesByMeal = new Map<string, DishRating[]>();
    for (const dish of dishes) {
      const key = dish.mealId ?? `${dish.date}|${dish.meal}|${dish.location}`;
      const group = dishesByMeal.get(key) ?? [];
      group.push(dish);
      dishesByMeal.set(key, group);
    }

    return meals
      .map((meal) => {
        const mealDishes = dishesByMeal.get(
          meal.id ?? `${meal.date}|${meal.meal}|${meal.location}`
        ) ?? [];
        const searchable = [
          meal.meal,
          meal.location,
          meal.notes,
          ...meal.favorites,
          ...meal.dislikes,
          ...mealDishes.flatMap((dish) => [dish.dish, dish.category, dish.notes]),
        ].join(" ");
        return { meal, dishes: mealDishes, searchable };
      })
      .filter(({ meal, searchable }) => {
        if (search && !matchesSearch(searchable, search)) return false;
        if (fromDate && meal.date < fromDate) return false;
        if (toDate && meal.date > toDate) return false;
        if (location !== "All" && normalizeCommons(meal.location) !== location) return false;
        if (mealType !== "All") {
          const normalized = normalizeMeal(meal.meal);
          if (mealType === "Dinner" && normalized !== "Dinner") return false;
          if (mealType === "Lunch" && normalized === "Dinner") return false;
        }
        return true;
      })
      .sort((a, b) => b.meal.date.localeCompare(a.meal.date));
  }, [dishes, meals, fromDate, location, mealType, search, toDate]);

  const clearFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setMealType("All");
    setLocation("All");
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/70">
          History
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">
          Archive
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Search every logged meal, dish, rating, and note.
        </p>
      </header>

      <section className="surface space-y-3 p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            aria-label="Search archive"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search dishes, meals, notes, or locations"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-3 text-base text-zinc-100 outline-none focus:border-zinc-600 sm:text-sm"
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowFilters((visible) => !visible)}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showFilters ? "Hide filters" : "Filter by date and meal"}
          </button>
          <span className="text-xs text-zinc-500">
            {entries.length} {entries.length === 1 ? "meal" : "meals"}
          </span>
        </div>
        {showFilters && (
          <div className="grid gap-3 border-t border-zinc-800 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">From date</span>
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="archive-input" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">To date</span>
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="archive-input" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Meal</span>
              <select value={mealType} onChange={(event) => setMealType(event.target.value)} className="archive-input">
                <option>All</option>
                <option>Lunch</option>
                <option>Dinner</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500">Location</span>
              <select value={location} onChange={(event) => setLocation(event.target.value)} className="archive-input">
                <option>All</option>
                {locations.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <button type="button" onClick={clearFilters} className="text-left text-xs text-zinc-500 hover:text-zinc-200 sm:col-span-2 lg:col-span-4">
              Clear all filters
            </button>
          </div>
        )}
      </section>

      {error ? (
        <div className="surface p-8 text-center text-sm text-rose-300">
          Couldn’t load the archive: {error instanceof Error ? error.message : String(error)}
        </div>
      ) : isLoading && meals.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-zinc-500">Loading archive…</div>
      ) : entries.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-zinc-500">No archived meals match your search.</div>
      ) : (
        <div className="space-y-3">
          {entries.map(({ meal, dishes: mealDishes }) => (
            <article key={meal.id ?? `${meal.date}-${meal.meal}-${meal.location}`} className="surface overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 p-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(meal.date)} · {normalizeCommons(meal.location)}
                  </div>
                  <h2 className="mt-1 text-base font-semibold text-zinc-100">{meal.meal}</h2>
                </div>
                <span className={cn("rounded-md border px-2 py-1 font-mono text-sm font-semibold", scoreAccent(meal.rating))}>
                  {meal.rating.toFixed(1)}
                </span>
              </div>
              <div className="p-4">
                {meal.notes && <p className="mb-3 text-sm leading-relaxed text-zinc-400">{meal.notes}</p>}
                {mealDishes.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {mealDishes.map((dish, index) => (
                      <div key={dish.id ?? `${dish.dish}-${index}`} className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-medium text-zinc-200">{dish.dish}</h3>
                            <p className="mt-0.5 text-xs text-zinc-600">{dish.category} · {dish.sentiment}</p>
                          </div>
                          <span className={cn("font-mono text-xs font-semibold", scoreAccent(dish.rating))}>{dish.rating.toFixed(1)}</span>
                        </div>
                        {dish.notes && <p className="mt-2 text-xs leading-relaxed text-zinc-500">{dish.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">No individual dish reviews recorded.</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <style jsx global>{`.archive-input { width: 100%; border-radius: 0.6rem; border: 1px solid #27272a; background-color: #09090b; padding: 0.55rem 0.75rem; font-size: 0.875rem; color: #f4f4f5; outline: none; } .archive-input:focus { border-color: #52525b; box-shadow: 0 0 0 1px #3f3f46; }`}</style>
    </div>
  );
}
