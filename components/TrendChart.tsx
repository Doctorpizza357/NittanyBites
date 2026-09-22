"use client";

import { useMemo } from "react";
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
import { round1 } from "@/lib/utils";

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
  const { data, count, avg } = useMemo(() => {
    const sorted = [...meals].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    );
    const data = sorted.map((m) => ({
      label: `${formatShort(m.date)} · ${m.meal}`,
      x: formatShort(m.date),
      rating: m.rating,
      meal: m.meal,
    }));
    const count = sorted.length;
    const avg = count
      ? round1(sorted.reduce((a, m) => a + m.rating, 0) / count)
      : 0;
    return { data, count, avg };
  }, [meals]);

  if (count === 0) {
    return (
      <div className="surface p-10 text-center text-sm text-zinc-500">
        No meals to chart yet.
      </div>
    );
  }

  return (
    <div className="surface p-5 sm:p-6">
      <div className="h-72 w-full">
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
              domain={[5, 10]}
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
            <defs>
              <linearGradient id="trend-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
            <Line
              type="monotone"
              dataKey="rating"
              stroke="url(#trend-stroke)"
              strokeWidth={2}
              dot={{ r: 3, fill: "#818cf8", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#a5b4fc", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">
        {count} {count === 1 ? "meal" : "meals"} logged ·{" "}
        <span className="font-mono tabular-nums text-zinc-300">{avg.toFixed(1)}</span>{" "}
        average score
      </p>
    </div>
  );
}
