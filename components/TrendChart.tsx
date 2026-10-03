"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type { MealLog } from "@/lib/types";
import { normalizeCommons, round1 } from "@/lib/utils";

const RANGES = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "Year", days: 365 },
  { label: "All time", days: null },
] as const;

function formatShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MinimalTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload as { label: string; rating: number; meal: string };
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs shadow-lg">
      <div className="text-zinc-400">{p.label}</div>
      <div className="mt-0.5 font-mono tabular-nums text-zinc-100">
        {p.rating.toFixed(1)} · {p.meal}
      </div>
    </div>
  );
}

export function TrendChart({ meals }: { meals: MealLog[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["label"]>("90 days");
  const [location, setLocation] = useState("All locations");
  const locations = Array.from(new Set(meals.map((meal) => normalizeCommons(meal.location)))).sort();
  const selectedRange = RANGES.find((option) => option.label === range) ?? RANGES[1];
  const { data, count, avg, previousAvg } = useMemo(() => {
    const now = new Date();
    const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const start = selectedRange.days === null ? null : new Date(now.getFullYear(), now.getMonth(), now.getDate() - selectedRange.days);
    const previousStart = selectedRange.days === null ? null : new Date(now.getFullYear(), now.getMonth(), now.getDate() - selectedRange.days * 2);
    const startKey = start ? dateString(start) : null;
    const previousStartKey = previousStart ? dateString(previousStart) : null;
    const matching = meals.filter((meal) =>
      (location === "All locations" || normalizeCommons(meal.location) === location) &&
      (!startKey || meal.date >= startKey)
    );
    const previous = selectedRange.days === null ? [] : meals.filter((meal) =>
      (location === "All locations" || normalizeCommons(meal.location) === location) &&
      meal.date >= (previousStartKey ?? "") && meal.date < (startKey ?? "")
    );
    const sorted = [...matching].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    );
    const data = sorted.map((m) => ({
      label: `${formatShort(m.date)} · ${m.meal}`,
      x: formatShort(m.date),
      rating: m.rating,
      meal: m.meal,
    }));
    const count = sorted.length;
    const average = count
      ? round1(sorted.reduce((total, meal) => total + meal.rating, 0) / count)
      : 0;
    const priorAverage = previous.length
      ? round1(previous.reduce((total, meal) => total + meal.rating, 0) / previous.length)
      : null;
    return { data, count, avg: average, previousAvg: priorAverage };
  }, [meals, location, selectedRange]);

  return (
    <div className="surface p-5 sm:p-6">
      <div className="mb-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Meal rating trend</h2>
            <p className="mt-1 text-xs text-zinc-500">Compare your average across time and dining locations.</p>
          </div>
          <select aria-label="Filter trends by location" value={location} onChange={(event) => setLocation(event.target.value)} className="min-h-11 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-300 sm:text-sm">
            <option>All locations</option>
            {locations.map((option) => <option key={option}>{option}</option>)}
          </select>
        </div>
        <div className="flex w-full rounded-lg border border-slate-700 bg-slate-950/70 p-1" role="group" aria-label="Trend time range">
          {RANGES.map((option) => <button key={option.label} type="button" aria-pressed={range === option.label} onClick={() => setRange(option.label)} className={`min-h-10 flex-1 rounded-md px-2 text-xs font-medium transition-colors ${range === option.label ? "bg-blue-900/70 text-sky-100" : "text-slate-400 hover:text-white"}`}>{option.label}</button>)}
        </div>
      </div>
      {count === 0 ? <div className="py-14 text-center text-sm text-zinc-500">No meals in this range for the selected location.</div> : <>
      <div className="h-56 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="x"
              stroke="#3f3f46"
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
            />
            <YAxis
              domain={[1, 10]}
              ticks={[1, 3, 5, 7, 9]}
              stroke="#3f3f46"
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              content={<MinimalTooltip />}
              cursor={{ stroke: "#3f3f46", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="#6ea8e8"
              strokeWidth={2}
              dot={{ r: 3, fill: "#6ea8e8", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#f4c445", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span>{count} {count === 1 ? "meal" : "meals"}</span>
        <span aria-hidden="true">·</span>
        <span>Average <strong className="font-mono font-medium tabular-nums text-zinc-200">{avg.toFixed(1)}</strong></span>
        {previousAvg !== null && <span className={avg >= previousAvg ? "text-emerald-300" : "text-rose-300"}>{avg >= previousAvg ? "+" : ""}{round1(avg - previousAvg).toFixed(1)} vs previous period</span>}
      </div>
      </>}
    </div>
  );
}
