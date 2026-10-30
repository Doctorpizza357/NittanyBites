"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Loader2,
  MapPin,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import type {
  DailyMenuSnapshot,
  DishRating,
  MenuLocation,
  MenuMeal,
} from "@/lib/types";
import { scoreAccent } from "@/lib/utils";

const LOCATIONS: { value: MenuLocation; label: string }[] = [
  { value: "Findlay", label: "East Food District · Findlay" },
  { value: "Warnock", label: "North Food District · Warnock" },
  { value: "Pollock", label: "Pollock Dining Commons" },
  { value: "Redifer", label: "South Food District · Redifer" },
  { value: "Waring", label: "West Food District · Waring" },
];
const MEALS: MenuMeal[] = ["Lunch", "Dinner"];
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

async function fetchMenu(url: string): Promise<DailyMenuSnapshot> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Menu data request failed (${response.status}).`);
  }
  return response.json() as Promise<DailyMenuSnapshot>;
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatUpdatedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "recently";
  return parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
}

function normalizeDishName(name: string): string {
  return name
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function getPreviousRatings(name: string, dishes: DishRating[]): DishRating[] {
  return dishes
    .filter(
    (dish) => normalizeDishName(dish.dish) === normalizeDishName(name)
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getPreviousRating(name: string, dishes: DishRating[]) {
  const matching = getPreviousRatings(name, dishes);
  if (matching.length === 0) return null;

  return {
    average:
      matching.reduce((total, dish) => total + dish.rating, 0) /
      matching.length,
    count: matching.length,
  };
}

export function DailyMenu({ dishes = [] }: { dishes?: DishRating[] }) {
  const [location, setLocation] = useState<MenuLocation>("Waring");
  const [meal, setMeal] = useState<MenuMeal>("Lunch");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR<DailyMenuSnapshot>(
    `${BASE_PATH}/daily-menu.json`,
    fetchMenu,
    { refreshInterval: 60 * 60 * 1000, revalidateOnFocus: true }
  );

  if (isLoading && !data) {
    return (
      <div className="surface flex min-h-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="surface p-8 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-amber-400" />
        <p className="mt-2 text-sm font-medium text-zinc-200">
          Today’s menus couldn’t be loaded.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {error instanceof Error ? error.message : "Menu data is unavailable."}
        </p>
        <button
          type="button"
          onClick={() => void mutate()}
          className="mt-4 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  const categories = data.menus[location][meal];
  const itemCount = categories.reduce(
    (total, category) => total + category.items.length,
    0
  );
  const visibleCategories = categories.filter(
    (category) => category.items.length > 0
  );
  const ratedItemCount = visibleCategories.reduce(
    (total, category) =>
      total +
      category.items.filter((item) => getPreviousRating(item.name, dishes))
        .length,
    0
  );

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-sky-300/15 bg-[#162b49] p-5 shadow-xl sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200/20 bg-sky-300/15 text-sky-200 shadow-inner">
                <UtensilsCrossed className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/70">
                  Today at Penn State
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                  Dining menus
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
                  <CalendarDays className="h-3.5 w-3.5 text-sky-300" />
                  {formatDate(data.date)}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 sm:text-right">
              Updated {formatUpdatedAt(data.updatedAt)}
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            <MenuSelector
              label="Dining location"
              options={LOCATIONS.map((location) => location.value)}
              labels={Object.fromEntries(
                LOCATIONS.map((location) => [location.value, location.label])
              )}
              selected={location}
              onSelect={setLocation}
              icon={<MapPin className="h-3.5 w-3.5" />}
            />
            <MenuSelector
              label="Service"
              options={MEALS}
              selected={meal}
              onSelect={setMeal}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-sky-200/15 bg-sky-300/10 px-3 py-1.5 font-medium text-sky-100">
              {itemCount} {itemCount === 1 ? "item" : "items"} today
            </span>
            {ratedItemCount > 0 && (
              <span className="rounded-full border border-amber-200/15 bg-amber-300/10 px-3 py-1.5 font-medium text-amber-100">
                <Star className="mr-1 inline h-3 w-3 fill-current" />
                {ratedItemCount} with your ratings
              </span>
            )}
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 text-slate-400 transition-colors hover:text-white"
            >
              Full Penn State menu <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </section>

      {itemCount === 0 ? (
        <div className="surface p-8 text-center text-sm text-zinc-400">
          No {meal.toLowerCase()} menu items are listed for {location} today.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleCategories.map((category, categoryIndex) => (
              <section
                key={category.name}
                className="surface overflow-hidden p-0 transition-colors hover:border-sky-300/30"
              >
                <div className="flex items-center justify-between gap-3 border-b border-sky-200/10 bg-blue-950/70 px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-300/10 text-xs font-semibold text-sky-200">
                      {String(categoryIndex + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm font-semibold tracking-wide text-sky-50">
                      {category.name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-700/60 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-300">
                    {category.items.length}
                  </span>
                </div>
                <ul className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4">
                  {category.items.map((item, index) => (
                    (() => {
                      const itemKey = `${category.name}-${item.name}-${index}`;
                      const ratings = getPreviousRatings(item.name, dishes);
                      const isExpanded = expandedItem === itemKey;
                      return (
                    <li key={itemKey} className={`group rounded-xl border bg-slate-950/20 text-sm text-slate-300 transition-all ${isExpanded ? "border-sky-300/30 bg-sky-300/5" : "border-transparent hover:border-sky-300/15 hover:bg-sky-300/5 hover:text-white"}`}>
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedItem(isExpanded ? null : itemKey)}
                        className="flex min-h-12 w-full items-center gap-2 px-3 py-2.5 text-left"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600 transition-colors group-hover:bg-sky-300" />
                        <span className="min-w-0 flex-1 leading-snug">{item.name}</span>
                        {ratings.length > 0 && (
                          <span
                            className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-semibold tabular-nums ${scoreAccent(ratings.reduce((total, rating) => total + rating.rating, 0) / ratings.length)}`}
                          >
                            ★ {(ratings.reduce((total, rating) => total + rating.rating, 0) / ratings.length).toFixed(1)}
                          </span>
                        )}
                        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isExpanded ? "rotate-180 text-sky-300" : ""}`} />
                      </button>
                      {isExpanded && (
                        <div className="border-t border-sky-200/10 px-3 pb-3 pt-2">
                          {ratings.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-200/60">
                                Previous ratings
                              </p>
                              {ratings.map((rating, ratingIndex) => (
                                <div key={`${rating.date}-${ratingIndex}`} className="rounded-lg border border-slate-700/70 bg-slate-950/40 p-2.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs text-slate-400">
                                      {formatDate(rating.date)}
                                    </span>
                                    <span className={`rounded border px-1.5 py-0.5 text-xs font-semibold tabular-nums ${scoreAccent(rating.rating)}`}>
                                      {rating.rating.toFixed(1)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {rating.location} · {rating.meal}
                                  </p>
                                  {rating.notes && (
                                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                                      {rating.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                              No previous ratings for this item.
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                      );
                    })()
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}

function MenuSelector<T extends string>({
  label,
  options,
  labels,
  selected,
  onSelect,
  icon,
}: {
  label: string;
  options: T[];
  labels?: Partial<Record<T, string>>;
  selected: T;
  onSelect: (value: T) => void;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
      <span className="mb-2 flex items-center gap-1.5">{icon}{label}</span>
        <select
          value={selected}
          onChange={(event) => {
            const selection = options.find(
              (option) => option === event.target.value
            );
            if (selection) onSelect(selection);
          }}
          className="min-h-11 w-full rounded-xl border border-slate-500/80 bg-slate-950/80 px-3 text-base font-medium normal-case tracking-normal text-zinc-100 outline-none transition-colors hover:border-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 sm:text-sm"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {labels?.[option] ?? option}
            </option>
          ))}
        </select>
    </label>
  );
}
