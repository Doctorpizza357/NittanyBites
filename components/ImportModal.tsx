"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Upload, Loader2, Copy, Check, Sparkles, AlertTriangle, ClipboardPaste, Pencil } from "lucide-react";
import { useMeals } from "@/lib/useMeals";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";
import { importMeals } from "@/lib/firestore";
import { validateImport, LLM_PROMPT, JSON_SCHEMA } from "@/lib/importSchema";
import { LogMealModal } from "./LogMealModal";
import type { ImportMeal } from "@/lib/importSchema";
import type { DishRating, LogMealPayload, MealLog } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ImportModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const { mutate } = useMeals();
  const { toast } = useToast();

  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"prompt" | "schema" | null>(null);
  const [staged, setStaged] = useState<LogMealPayload[] | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  const reviewDraft = useMemo(() => {
    if (reviewIndex === null || !staged?.[reviewIndex]) return undefined;
    const entry = staged[reviewIndex];
    const meal: MealLog = { ...entry.mealLog, day: "" };
    const dishes: DishRating[] = entry.dishes.map((dish) => ({
      date: entry.mealLog.date,
      meal: entry.mealLog.meal,
      location: entry.mealLog.location,
      dish: dish.dish,
      category: dish.category,
      rating: dish.rating,
      sentiment: dish.sentiment,
      notes: dish.notes,
    }));
    return { meal, dishes };
  }, [reviewIndex, staged]);

  const close = (afterImport = false) => {
    if (busy && !afterImport) return;
    onClose();
    setTimeout(() => {
      setText("");
      setErrors([]);
      setStaged(null);
      setReviewIndex(null);
    }, 200);
  };

  const copy = async (what: "prompt" | "schema") => {
    const payload =
      what === "prompt" ? LLM_PROMPT : JSON.stringify(JSON_SCHEMA, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast("Couldn’t copy.", "error");
    }
  };

  const paste = async () => {
    try {
      const pasted = await navigator.clipboard.readText();
      if (!pasted) {
        toast("Clipboard is empty.", "info");
        return;
      }
      setText(pasted);
      setStaged(null);
      setErrors([]);
    } catch {
      toast("Clipboard access is unavailable. Paste into the field instead.", "error");
    }
  };

  const parseText = () => {
    setErrors([]);
    try {
      const result = validateImport(JSON.parse(text));
      if (!result.ok || !result.payload) {
        setErrors(result.errors);
        return null;
      }
      return result.payload.meals;
    } catch {
      setErrors(["That isn’t valid JSON. Paste the object returned by your LLM."]);
      return null;
    }
  };

  const reviewBeforeImport = () => {
    const meals = parseText();
    if (!meals) return;
    setStaged(meals.map((meal) => ({
      mealLog: {
        date: meal.date,
        meal: meal.meal,
        location: meal.location,
        rating: meal.rating,
        favorites: meal.favorites ?? [],
        dislikes: meal.dislikes ?? [],
        notes: meal.notes ?? "",
      },
      dishes: (meal.dishes ?? []).map((dish) => ({
        dish: dish.dish,
        category: dish.category,
        rating: dish.rating,
        sentiment: dish.sentiment as LogMealPayload["dishes"][number]["sentiment"],
        notes: dish.notes ?? "",
      })),
    })));
    setReviewIndex(0);
  };

  const saveReviewedMeal = (payload: LogMealPayload) => {
    setStaged((current) => current?.map((meal, index) => index === reviewIndex ? payload : meal) ?? null);
  };

  const closeReview = () => {
    setReviewIndex((index) => index !== null && staged && index + 1 < staged.length ? index + 1 : null);
  };

  const handleImport = async () => {
    const meals: ImportMeal[] | null = staged
      ? staged.map(({ mealLog, dishes }) => ({ ...mealLog, dishes }))
      : parseText();
    if (!meals) return;

    if (!user) {
      setErrors(["You must be signed in as the owner."]);
      return;
    }

    setBusy(true);
    try {
      const counts = await importMeals(user.uid, meals);
      await mutate();
      toast(
        `Imported ${counts.meals} meals and ${counts.dishes} dishes.`,
        "success"
      );
      close(true);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Import failed."]);
    } finally {
      setBusy(false);
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
            onClick={() => close()}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-modal-title"
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:max-h-[92vh] sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-400" />
                <h2 id="import-modal-title" className="text-sm font-semibold text-zinc-100">
                  Import from JSON
                </h2>
              </div>
              <button
                type="button"
                onClick={() => close()}
                aria-label="Close import dialog"
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-300">
                  <Sparkles className="h-4 w-4" />
                  Log with natural language
                </div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Copy the prompt into any LLM, describe your meal, and paste the
                  JSON it returns below.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => copy("prompt")}
                    className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-100"
                  >
                    {copied === "prompt" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy prompt
                  </button>
                  <button
                    onClick={() => copy("schema")}
                    className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-100"
                  >
                    {copied === "schema" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy JSON schema
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="meal-import-json" className="text-xs font-medium text-zinc-400">Meal JSON</label>
                  <button type="button" onClick={paste} className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-zinc-700 px-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white">
                    <ClipboardPaste className="h-4 w-4" /> Paste
                  </button>
                </div>
                <textarea
                  id="meal-import-json"
                  value={text}
                  onChange={(e) => { setText(e.target.value); setStaged(null); setErrors([]); }}
                  rows={8}
                  placeholder='{ "meals": [ { "date": "2026-09-21", "meal": "Dinner", "location": "Waring Commons", "rating": 8.3, "dishes": [ ... ] } ] }'
                  className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-base leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-600 sm:text-xs"
                />
                {staged && <p className="mt-2 text-xs text-emerald-300">{staged.length} {staged.length === 1 ? "meal is" : "meals are"} ready to import{staged.length > 0 ? " · edits included" : ""}.</p>}
              </div>

              {errors.length > 0 && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-rose-300">
                    <AlertTriangle className="h-4 w-4" />
                    Couldn’t import
                  </div>
                  <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-zinc-400">
                    {errors.slice(0, 8).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-zinc-800 px-4 pt-3 sm:justify-end sm:px-5 sm:py-4" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
              <button type="button" onClick={reviewBeforeImport} disabled={busy || !text.trim()} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 disabled:opacity-50 sm:flex-none">
                <Pencil className="h-4 w-4" /> Review first
              </button>
              <button
                onClick={handleImport}
                disabled={busy || !text.trim()}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:flex-none"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Importing…" : "Import"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {reviewDraft && (
        <LogMealModal
          key={reviewIndex}
          open
          draft={reviewDraft}
          onDraftSave={saveReviewedMeal}
          onClose={closeReview}
        />
      )}
    </AnimatePresence>
  );
}
