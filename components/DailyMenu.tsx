"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  UtensilsCrossed,
} from "lucide-react";
import type {
  DailyMenuSnapshot,
  MenuLocation,
  MenuMeal,
} from "@/lib/types";

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

function dietaryColor(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized.includes("vegan")) {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }
  if (normalized.includes("pork")) {
    return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  }
  if (normalized.includes("halal")) {
    return "border-violet-400/25 bg-violet-400/10 text-violet-200";
  }
  if (normalized.includes("gluten")) {
    return "border-amber-400/25 bg-amber-400/10 text-amber-100";
  }
  return "border-sky-400/25 bg-sky-400/10 text-sky-100";
}

export function DailyMenu() {
  const [location, setLocation] = useState<MenuLocation>("Waring");
  const [meal, setMeal] = useState<MenuMeal>("Lunch");
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

  return (
    <div className="space-y-4">
      <section className="surface space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900/70 text-sky-200">
                <UtensilsCrossed className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-zinc-100">
                  Penn State dining menus
                </h2>
                <p className="mt-0.5 text-sm text-slate-300">{formatDate(data.date)}</p>
              </div>
            </div>
          </div>
          <p className="pl-10 text-xs text-slate-400 sm:pl-0">
            Updated {formatUpdatedAt(data.updatedAt)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MenuSelector
            label="Location"
            options={LOCATIONS.map((location) => location.value)}
            labels={Object.fromEntries(
              LOCATIONS.map((location) => [location.value, location.label])
            )}
            selected={location}
            onSelect={setLocation}
          />
          <MenuSelector
            label="Meal"
            options={MEALS}
            selected={meal}
            onSelect={setMeal}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-700/80 pt-3 text-xs text-zinc-400">
          <span className="rounded-md bg-blue-400/10 px-2 py-1 font-medium text-blue-200">
            {itemCount} {itemCount === 1 ? "menu item" : "menu items"}
          </span>
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-zinc-300"
          >
            Penn State menu <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>

      {itemCount === 0 ? (
        <div className="surface p-8 text-center text-sm text-zinc-400">
          No {meal.toLowerCase()} menu items are listed for {location} today.
        </div>
      ) : (
        <div className="space-y-3">
          {categories
            .filter((category) => category.items.length > 0)
            .map((category) => (
              <section
                key={category.name}
                className="surface overflow-hidden p-4 sm:p-5"
              >
                <div className="-mx-4 -mt-4 mb-4 flex items-center justify-between gap-3 border-b border-blue-300/10 bg-blue-950/35 px-4 py-3 sm:-mx-5 sm:-mt-5 sm:px-5">
                  <h3 className="text-sm font-semibold tracking-wide text-sky-100">
                    {category.name}
                  </h3>
                  <span className="rounded-md bg-amber-300/10 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-200">
                    {category.items.length}
                  </span>
                </div>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {category.items.map((item, index) => (
                    <li
                      key={`${item.name}-${index}`}
                      className="flex flex-wrap items-center gap-2 text-sm text-zinc-300"
                    >
                      <span>{item.name}</span>
                      {item.dietary.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded border px-1.5 py-0.5 text-[10px] ${dietaryColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </li>
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
}: {
  label: string;
  options: T[];
  labels?: Partial<Record<T, string>>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
        <select
          value={selected}
          onChange={(event) => {
            const selection = options.find(
              (option) => option === event.target.value
            );
            if (selection) onSelect(selection);
          }}
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-base text-zinc-100 outline-none transition-colors focus:border-sky-400 sm:text-sm"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {labels?.[option] ?? option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
