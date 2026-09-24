"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import type { DishFormInput, DishRating, Sentiment } from "@/lib/types";
import { updateDish } from "@/lib/firestore";
import { useAuth } from "./AuthProvider";
import { useMeals } from "@/lib/useMeals";
import { useToast } from "./Toast";
import { cn, scoreAccent } from "@/lib/utils";

const CATEGORY_OPTIONS = ["Entree", "Side", "Dessert", "Deli / Sub", "Breakfast"];
const SENTIMENT_OPTIONS: Sentiment[] = ["Favorite", "Liked", "Neutral", "Disliked"];

export function EditDishModal({
  dish,
  onClose,
}: {
  dish: DishRating | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { mutate } = useMeals();
  const { toast } = useToast();
  const [form, setForm] = useState<DishFormInput | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dish) return;
    setForm({
      id: dish.id,
      dish: dish.dish,
      category: dish.category,
      rating: dish.rating,
      sentiment: (dish.sentiment as Sentiment) || "Neutral",
      notes: dish.notes,
    });
  }, [dish]);

  const save = async () => {
    if (!user || !form?.id || !form.dish.trim()) return;
    setSaving(true);
    try {
      await updateDish(form.id, { ...form, dish: form.dish.trim() });
      await mutate();
      toast("Ranking updated.", "success");
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {dish && form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !saving && onClose()}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            className="relative w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Edit Ranking</h2>
                <p className="mt-0.5 text-xs text-zinc-500">{dish.location} · {dish.date}</p>
              </div>
              <button onClick={onClose} disabled={saving} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-zinc-400">Dish name</span>
                <input className="input" value={form.dish} onChange={(e) => setForm({ ...form, dish: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORY_OPTIONS.map((category) => <option key={category}>{category}</option>)}
                </select>
                <select className="input" value={form.sentiment} onChange={(e) => setForm({ ...form, sentiment: e.target.value as Sentiment })}>
                  {SENTIMENT_OPTIONS.map((sentiment) => <option key={sentiment}>{sentiment}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={10} step={0.1} value={form.rating} onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) })} className="flex-1" />
                <span className={cn("score", scoreAccent(form.rating))}>{form.rating.toFixed(1)}</span>
              </div>
              <textarea className="input resize-none" rows={3} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} disabled={saving} className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100">Cancel</button>
              <button onClick={save} disabled={saving || !form.dish.trim()} className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </motion.div>
          <style jsx global>{`.input { width: 100%; border-radius: 0.6rem; border: 1px solid #27272a; background-color: #09090b; padding: 0.55rem 0.75rem; font-size: 0.875rem; color: #f4f4f5; outline: none; } .input:focus { border-color: #52525b; box-shadow: 0 0 0 1px #3f3f46; }`}</style>
        </div>
      )}
    </AnimatePresence>
  );
}
