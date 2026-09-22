"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Upload, Loader2, Copy, Check, Sparkles, AlertTriangle } from "lucide-react";
import { useMeals } from "@/lib/useMeals";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";
import { importMeals } from "@/lib/firestore";
import { validateImport, LLM_PROMPT, JSON_SCHEMA } from "@/lib/importSchema";

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

  const close = () => {
    if (busy) return;
    onClose();
    setTimeout(() => {
      setText("");
      setErrors([]);
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

  const handleImport = async () => {
    setErrors([]);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setErrors(["That isn’t valid JSON. Paste the object returned by your LLM."]);
      return;
    }

    const result = validateImport(parsed);
    if (!result.ok || !result.payload) {
      setErrors(result.errors);
      return;
    }

    if (!user) {
      setErrors(["You must be signed in as the owner."]);
      return;
    }

    setBusy(true);
    try {
      const counts = await importMeals(user.uid, result.payload.meals);
      await mutate();
      toast(
        `Imported ${counts.meals} meals and ${counts.dishes} dishes.`,
        "success"
      );
      close();
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
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Import from JSON
                </h2>
              </div>
              <button
                onClick={close}
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

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                placeholder='{ "meals": [ { "date": "2026-09-21", "meal": "Dinner", "location": "Waring Commons", "rating": 8.3, "dishes": [ ... ] } ] }'
                className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-600"
              />

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

            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-5 py-4">
              <button
                onClick={close}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={busy || !text.trim()}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Importing…" : "Import"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
