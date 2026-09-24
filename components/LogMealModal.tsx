"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  Utensils,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { cn, scoreAccent } from "@/lib/utils";
import { useMeals } from "@/lib/useMeals";
import { isFirebaseConfigured } from "@/lib/firebase";
import { addMealToFirestore, updateMealInFirestore } from "@/lib/firestore";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";
import type {
  DishFormInput,
  LogMealPayload,
  MealFormInput,
  MealLog,
  DishRating,
  Sentiment,
} from "@/lib/types";

const MEAL_OPTIONS = ["Lunch", "Brunch", "Dinner"];
const LOCATION_OPTIONS = [
  "Waring Commons",
  "Redifer Commons",
  "Pollock Commons",
  "East Food District",
  "North Food District",
  "HUB Dining",
];
const CATEGORY_OPTIONS = [
  "Entree",
  "Side",
  "Dessert",
  "Deli / Sub",
  "Breakfast",
];
const SENTIMENT_OPTIONS: Sentiment[] = [
  "Favorite",
  "Liked",
  "Neutral",
  "Disliked",
];

const STEPS = ["Meal", "Score", "Dishes", "Summary"] as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDish(): DishFormInput {
  return { dish: "", category: "Entree", rating: 8.0, sentiment: "Liked", notes: "" };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: { meal: MealLog; dishes: DishRating[] };
}

export function LogMealModal({ open, onClose, editing }: Props) {
  const { user } = useAuth();
  const { mutate } = useMeals();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [meal, setMeal] = useState<MealFormInput>({
    date: today(),
    meal: "Dinner",
    location: "Waring Commons",
    rating: 8.0,
    favorites: [],
    dislikes: [],
    notes: "",
  });
  const [dishes, setDishes] = useState<DishFormInput[]>([emptyDish()]);
  const [favInput, setFavInput] = useState("");
  const [disInput, setDisInput] = useState("");

  useEffect(() => {
    if (!open || !editing) return;
    setStep(0);
    setMeal({
      date: editing.meal.date,
      meal: editing.meal.meal,
      location: editing.meal.location,
      rating: editing.meal.rating,
      favorites: [...editing.meal.favorites],
      dislikes: [...editing.meal.dislikes],
      notes: editing.meal.notes,
    });
    setDishes(
      editing.dishes.map((dish) => ({
        id: dish.id,
        dish: dish.dish,
        category: dish.category,
        rating: dish.rating,
        sentiment: dish.sentiment as Sentiment,
        notes: dish.notes,
      }))
    );
  }, [open, editing]);

  const resetAll = () => {
    setStep(0);
    setMeal({
      date: today(),
      meal: "Dinner",
      location: "Waring Commons",
      rating: 8.0,
      favorites: [],
      dislikes: [],
      notes: "",
    });
    setDishes([emptyDish()]);
    setFavInput("");
    setDisInput("");
  };

  const close = () => {
    if (submitting) return;
    onClose();
    setTimeout(resetAll, 250);
  };

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(meal.date && meal.meal && meal.location);
    return true;
  }, [step, meal]);

  const addChip = (kind: "favorites" | "dislikes") => {
    const value = (kind === "favorites" ? favInput : disInput).trim();
    if (!value) return;
    setMeal((m) => ({ ...m, [kind]: [...m[kind], value] }));
    if (kind === "favorites") setFavInput("");
    else setDisInput("");
  };

  const removeChip = (kind: "favorites" | "dislikes", idx: number) => {
    setMeal((m) => ({ ...m, [kind]: m[kind].filter((_, i) => i !== idx) }));
  };

  const updateDish = (idx: number, patch: Partial<DishFormInput>) => {
    setDishes((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const validDishes = dishes.filter((d) => d.dish.trim() !== "");
    const payload: LogMealPayload = { mealLog: meal, dishes: validDishes };

    try {
      if (!isFirebaseConfigured()) {
        // Demo mode: optimistically show it locally without persisting.
        await mutate(
          (cur) =>
            cur
              ? {
                  ...cur,
                  meals: [
                    ...cur.meals,
                    {
                      ...meal,
                      day: "",
                      favorites: meal.favorites,
                      dislikes: meal.dislikes,
                    },
                  ],
                  dishes: [
                    ...cur.dishes,
                    ...validDishes.map((d) => ({
                      date: meal.date,
                      meal: meal.meal,
                      dish: d.dish,
                      location: meal.location,
                      category: d.category,
                      rating: d.rating,
                      sentiment: d.sentiment,
                      notes: d.notes,
                    })),
                  ],
                }
              : cur,
          { revalidate: false }
        );
        toast(
          "Logged locally (Demo Mode). Add Firebase config to persist.",
          "info"
        );
        close();
        return;
      }

      if (!user) throw new Error("You must be signed in to log a meal.");
      if (editing) {
        if (!editing.meal.id) throw new Error("This meal cannot be edited.");
        await updateMealInFirestore(
          user.uid,
          editing.meal.id,
          { date: editing.meal.date, meal: editing.meal.meal },
          payload
        );
      } else {
        await addMealToFirestore(user.uid, payload);
      }
      await mutate();
      toast(editing ? "Meal updated!" : "Meal logged!", "success");
      close();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to log meal.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:rounded-2xl"
          >
            {/* Header + steps */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">
                  {editing ? "Edit Meal" : "Log a Meal"}
                </h2>
                <p className="text-xs text-slate-500">
                  Step {step + 1} of {STEPS.length} · {STEPS[step]}
                </p>
              </div>
              <button
                onClick={close}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-1.5 px-5 pt-3">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i <= step ? "bg-zinc-100" : "bg-zinc-800"
                  )}
                />
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {step === 0 && (
                    <>
                      <SectionLabel icon={CalendarDays} text="Meal Metadata" />
                      <Field label="Date">
                        <input
                          type="date"
                          value={meal.date}
                          onChange={(e) =>
                            setMeal((m) => ({ ...m, date: e.target.value }))
                          }
                          className="input"
                        />
                      </Field>
                      <Field label="Meal">
                        <div className="grid grid-cols-3 gap-2">
                          {MEAL_OPTIONS.map((opt) => (
                            <SegBtn
                              key={opt}
                              active={meal.meal === opt}
                              onClick={() => setMeal((m) => ({ ...m, meal: opt }))}
                            >
                              {opt}
                            </SegBtn>
                          ))}
                        </div>
                      </Field>
                      <Field label="Location">
                        <select
                          value={meal.location}
                          onChange={(e) =>
                            setMeal((m) => ({ ...m, location: e.target.value }))
                          }
                          className="input"
                        >
                          {LOCATION_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <SectionLabel icon={Utensils} text="Overall Score" />
                      <div className="flex flex-col items-center gap-4 py-6">
                        <div
                          className={cn(
                            "flex h-28 w-28 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 font-mono text-4xl font-medium tabular-nums text-zinc-100"
                          )}
                        >
                          {meal.rating.toFixed(1)}
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={0.1}
                          value={meal.rating}
                          onChange={(e) =>
                            setMeal((m) => ({
                              ...m,
                              rating: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full"
                        />
                        <div className="flex w-full justify-between text-xs text-slate-500">
                          <span>1.0</span>
                          <span>10.0</span>
                        </div>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <SectionLabel icon={ClipboardList} text="Dishes" />
                      <div className="space-y-3">
                        {dishes.map((d, idx) => (
                          <div
                            key={idx}
                            className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Dish {idx + 1}
                              </span>
                              {dishes.length > 1 && (
                                <button
                                  onClick={() =>
                                    setDishes((prev) =>
                                      prev.filter((_, i) => i !== idx)
                                    )
                                  }
                                  className="text-slate-500 hover:text-rose"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <input
                              placeholder="Dish name"
                              value={d.dish}
                              onChange={(e) =>
                                updateDish(idx, { dish: e.target.value })
                              }
                              className="input"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={d.category}
                                onChange={(e) =>
                                  updateDish(idx, { category: e.target.value })
                                }
                                className="input"
                              >
                                {CATEGORY_OPTIONS.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={d.sentiment}
                                onChange={(e) =>
                                  updateDish(idx, {
                                    sentiment: e.target.value as Sentiment,
                                  })
                                }
                                className="input"
                              >
                                {SENTIMENT_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min={1}
                                max={10}
                                step={0.1}
                                value={d.rating}
                                onChange={(e) =>
                                  updateDish(idx, {
                                    rating: parseFloat(e.target.value),
                                  })
                                }
                                className="flex-1"
                              />
                              <span className={cn("score", scoreAccent(d.rating))}>
                                {d.rating.toFixed(1)}
                              </span>
                            </div>
                            <input
                              placeholder="Notes (optional)"
                              value={d.notes}
                              onChange={(e) =>
                                updateDish(idx, { notes: e.target.value })
                              }
                              className="input"
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => setDishes((p) => [...p, emptyDish()])}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                        >
                          <Plus className="h-4 w-4" /> Add Dish
                        </button>
                      </div>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <SectionLabel icon={Sparkles} text="Summary" />
                      <Field label="Highlights & Favorites">
                        <ChipEditor
                          input={favInput}
                          setInput={setFavInput}
                          items={meal.favorites}
                          onAdd={() => addChip("favorites")}
                          onRemove={(i) => removeChip("favorites", i)}
                          tone="emerald"
                          placeholder="Add a favorite…"
                        />
                      </Field>
                      <Field label="Dislikes & Issues">
                        <ChipEditor
                          input={disInput}
                          setInput={setDisInput}
                          items={meal.dislikes}
                          onAdd={() => addChip("dislikes")}
                          onRemove={(i) => removeChip("dislikes", i)}
                          tone="rose"
                          placeholder="Add an issue…"
                        />
                      </Field>
                      <Field label="Summary Notes">
                        <textarea
                          rows={3}
                          value={meal.notes}
                          onChange={(e) =>
                            setMeal((m) => ({ ...m, notes: e.target.value }))
                          }
                          placeholder="Overall thoughts on the meal…"
                          className="input resize-none"
                        />
                      </Field>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-5 py-4">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0 || submitting}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext}
                  className="flex items-center gap-1 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Saving…" : editing ? "Save Changes" : "Log Meal"}
                </button>
              )}
            </div>
          </motion.div>

          <style jsx global>{`
            .input {
              width: 100%;
              border-radius: 0.6rem;
              border: 1px solid #27272a;
              background-color: #09090b;
              padding: 0.55rem 0.75rem;
              font-size: 0.875rem;
              color: #f4f4f5;
              outline: none;
            }
            .input::placeholder {
              color: #52525b;
            }
            .input:focus {
              border-color: #52525b;
              box-shadow: 0 0 0 1px #3f3f46;
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
      <Icon className="h-3.5 w-3.5" />
      {text}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border py-2 text-sm font-medium transition-colors",
        active
          ? "border-zinc-600 bg-zinc-800 text-zinc-100"
          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
      )}
    >
      {children}
    </button>
  );
}

function ChipEditor({
  input,
  setInput,
  items,
  onAdd,
  onRemove,
  tone,
  placeholder,
}: {
  input: string;
  setInput: (v: string) => void;
  items: string[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  tone: "emerald" | "rose";
  placeholder: string;
}) {
  const toneCls =
    tone === "emerald"
      ? "border-zinc-700 bg-zinc-800/60 text-emerald-300/90"
      : "border-zinc-700 bg-zinc-800/60 text-rose-300/90";
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className="input"
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-zinc-300 transition-colors hover:text-zinc-100"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                toneCls
              )}
            >
              {it}
              <button onClick={() => onRemove(i)} className="ml-0.5 opacity-70 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
