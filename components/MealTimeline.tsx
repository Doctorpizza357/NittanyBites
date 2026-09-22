"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Trash2,
  Loader2,
} from "lucide-react";
import type { MealLog, DishRating } from "@/lib/types";
import { cn, normalizeCommons, normalizeMeal, scoreAccent } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { useMeals } from "@/lib/useMeals";
import { useToast } from "./Toast";
import { isOwnerUid } from "@/lib/firebase";
import { deleteMeal } from "@/lib/firestore";

interface Props {
  meals: MealLog[];
  dishes: DishRating[];
}

const LOCATION_FILTERS = ["All", "Waring Commons", "Redifer Commons"];
const MEAL_FILTERS = ["All", "Lunch", "Dinner"];
type TimelineView = "calendar" | "list";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function dateValue(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mealOrder(meal: string): number {
  return normalizeMeal(meal) === "Dinner" ? 1 : 0;
}

export function MealTimeline({ meals, dishes }: Props) {
  const { user } = useAuth();
  const { mutate } = useMeals();
  const { toast } = useToast();
  const isOwner = isOwnerUid(user?.uid);
  const [loc, setLoc] = useState("All");
  const [mealType, setMealType] = useState("All");
  const [view, setView] = useState<TimelineView>("calendar");
  const [selectedDate, setSelectedDate] = useState(meals[0]?.date ?? "");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const initial = meals[0] ? dateValue(meals[0].date) : new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  const handleDelete = async (meal: MealLog) => {
    if (!user) return;
    if (
      !window.confirm(
        `Delete "${meal.meal} · ${meal.location}" on ${meal.date} and its dishes? This can't be undone.`
      )
    )
      return;
    try {
      await deleteMeal(user.uid, {
        id: meal.id,
        date: meal.date,
        meal: meal.meal,
      });
      await mutate();
      toast("Meal deleted.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed.", "error");
    }
  };

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
      .sort((a, b) =>
        a.date === b.date
          ? mealOrder(a.meal) - mealOrder(b.meal)
          : a.date < b.date
            ? 1
            : -1
      );
  }, [meals, loc, mealType]);

  const mealsByDate = useMemo(() => {
    const grouped = new Map<string, MealLog[]>();
    for (const meal of filtered) {
      const dayMeals = grouped.get(meal.date) ?? [];
      dayMeals.push(meal);
      grouped.set(meal.date, dayMeals);
    }
    return grouped;
  }, [filtered]);

  const activeDate = mealsByDate.has(selectedDate)
    ? selectedDate
    : filtered[0]?.date ?? "";
  const selectedMeals = mealsByDate.get(activeDate) ?? [];
  const firstWeekday = calendarMonth.getDay();
  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();
  const calendarDays = Array.from(
    { length: firstWeekday + daysInMonth },
    (_, index) => (index < firstWeekday ? null : index - firstWeekday + 1)
  );

  const moveMonth = (amount: number) => {
    setCalendarMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1)
    );
  };

  const chooseDate = (date: string) => {
    setSelectedDate(date);
    const selected = dateValue(date);
    setCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterGroup options={LOCATION_FILTERS} value={loc} onChange={setLoc} />
          <span className="mx-1 hidden h-4 w-px bg-zinc-800 sm:block" />
          <FilterGroup options={MEAL_FILTERS} value={mealType} onChange={setMealType} />
        </div>
        <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
          <ViewButton
            active={view === "calendar"}
            label="Calendar"
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            onClick={() => setView("calendar")}
          />
          <ViewButton
            active={view === "list"}
            label="List"
            icon={<List className="h-3.5 w-3.5" />}
            onClick={() => setView("list")}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-zinc-500">
          No meals match these filters.
        </div>
      ) : (
        <div className="space-y-5">
          {view === "list" ? (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-zinc-200">
                  All reviews
                </h2>
                <span className="text-xs text-zinc-600">
                  {filtered.length} {filtered.length === 1 ? "review" : "reviews"}
                </span>
              </div>
              {filtered.map((meal, index) => (
                <MealEntry
                  key={`${meal.date}-${meal.meal}-${index}`}
                  meal={meal}
                  dishes={dishes}
                  index={index}
                  canDelete={isOwner}
                  onDelete={() => handleDelete(meal)}
                />
              ))}
            </div>
          ) : (
            <>
          <section className="surface overflow-hidden p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">
                  {calendarMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Select a date to see its meal reviews
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveMonth(-1)}
                  title="Previous month"
                  className="rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveMonth(1)}
                  title="Next month"
                  className="rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-medium uppercase tracking-wide text-zinc-600">
              {[
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
              ].map((day) => (
                <span key={day} className="py-1">
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (!day) return <span key={`empty-${index}`} className="min-h-12" />;
                const date = dateKey(
                  new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
                );
                const dayMeals = mealsByDate.get(date) ?? [];
                const isSelected = date === activeDate;
                return (
                  <button
                    key={date}
                    onClick={() => dayMeals.length > 0 && chooseDate(date)}
                    disabled={dayMeals.length === 0}
                    className={cn(
                      "flex min-h-12 flex-col items-center justify-start rounded-lg border p-1.5 text-xs transition-colors sm:min-h-14",
                      isSelected
                        ? "border-blue-400/70 bg-blue-500/15 text-blue-200"
                        : dayMeals.length > 0
                          ? "border-zinc-800 bg-zinc-950/50 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/70"
                          : "border-transparent text-zinc-700"
                    )}
                  >
                    <span>{day}</span>
                    {dayMeals.length > 0 && (
                      <span className="mt-1 flex gap-0.5">
                        {dayMeals.map((meal) => (
                          <span
                            key={`${meal.date}-${meal.meal}`}
                            className={cn(
                              "h-1 w-1 rounded-full",
                              normalizeMeal(meal.meal) === "Dinner"
                                ? "bg-indigo-400"
                                : "bg-amber-300"
                            )}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-200">
              {activeDate ? formatDate(activeDate) : "No selected date"}
            </h2>
            {selectedMeals.map((meal, index) => (
              <MealEntry
                key={`${meal.date}-${meal.meal}-${index}`}
                meal={meal}
                dishes={dishes}
                index={index}
                canDelete={isOwner}
                onDelete={() => handleDelete(meal)}
              />
            ))}
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ViewButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-500 hover:text-zinc-300"
      )}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
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
              ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
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
  canDelete,
  onDelete,
}: {
  meal: MealLog;
  dishes: DishRating[];
  index: number;
  canDelete: boolean;
  onDelete: () => void | Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  // Match dishes to this meal by date + meal label.
  const mealDishes = dishes
    .filter((d) => d.date === meal.date && d.meal === meal.meal)
    .sort((a, b) => b.rating - a.rating);

  const runDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="surface group p-5"
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
        <div className="flex shrink-0 items-center gap-2">
          {canDelete && (
            <button
              onClick={runDelete}
              disabled={deleting}
              title="Delete meal"
              className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          )}
          <span
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-sm font-semibold tabular-nums",
              scoreAccent(meal.rating)
            )}
          >
            {meal.rating.toFixed(1)}
          </span>
        </div>
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
