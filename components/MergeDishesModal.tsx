"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GitMerge, Loader2, Search, X } from "lucide-react";
import { mergeDishes } from "@/lib/firestore";
import { useAuth } from "./AuthProvider";
import { useMeals } from "@/lib/useMeals";
import { useToast } from "./Toast";
import { cn, normalizeDishName } from "@/lib/utils";

interface Props {
  sourceNames: string[];
  targetNames: string[];
  open: boolean;
  onClose: () => void;
}

export function MergeDishesModal({ sourceNames, targetNames, open, onClose }: Props) {
  const { user } = useAuth();
  const { mutate } = useMeals();
  const { toast } = useToast();
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [sourceFocus, setSourceFocus] = useState(false);
  const [targetFocus, setTargetFocus] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSource(sourceNames[0] ?? "");
    setTarget(targetNames[0] ?? "");
  }, [open, sourceNames, targetNames]);

  const sourceMatches = sourceNames
    .filter((name) => normalizeDishName(name).includes(normalizeDishName(source)))
    .slice(0, 8);
  const targetMatches = targetNames
    .filter((name) => normalizeDishName(name).includes(normalizeDishName(target)))
    .slice(0, 8);

  const save = async () => {
    const sourceMatch = sourceNames.find((name) => normalizeDishName(name) === normalizeDishName(source));
    const targetMatch = targetNames.find((name) => normalizeDishName(name) === normalizeDishName(target));
    if (!user || !sourceMatch || !targetMatch || normalizeDishName(sourceMatch) === normalizeDishName(targetMatch)) return;
    setSaving(true);
    try {
      const count = await mergeDishes(user.uid, sourceMatch, targetMatch);
      await mutate();
      toast(count > 0 ? `Merged ${count} review${count === 1 ? "" : "s"} into “${targetMatch}”.` : "No matching reviews found.", count > 0 ? "success" : "info");
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Merge failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && onClose()} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.98 }} className="relative w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100"><GitMerge className="h-4 w-4 text-sky-300" /> Merge dish names</h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">Move all reviews from one name into a name that has appeared on a Penn State menu. Ratings and notes are kept.</p>
              </div>
              <button onClick={onClose} disabled={saving} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-zinc-400">Merge this name</span>
                <SearchField label="Dish name to merge" value={source} matches={sourceMatches} focused={sourceFocus} onFocus={() => setSourceFocus(true)} onBlur={() => setTimeout(() => setSourceFocus(false), 120)} onChange={setSource} onSelect={(name) => { setSource(name); setSourceFocus(false); }} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-zinc-400">Into this name</span>
                <SearchField label="Canonical menu name" value={target} matches={targetMatches} focused={targetFocus} onFocus={() => setTargetFocus(true)} onBlur={() => setTimeout(() => setTargetFocus(false), 120)} onChange={setTarget} onSelect={(name) => { setTarget(name); setTargetFocus(false); }} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} disabled={saving} className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100">Cancel</button>
              <button onClick={save} disabled={saving || !sourceNames.some((name) => normalizeDishName(name) === normalizeDishName(source)) || !targetNames.some((name) => normalizeDishName(name) === normalizeDishName(target)) || normalizeDishName(source) === normalizeDishName(target)} className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Merge reviews
              </button>
            </div>
          </motion.div>
          <style jsx global>{`.input { width: 100%; border-radius: 0.6rem; border: 1px solid #27272a; background-color: #09090b; padding: 0.55rem 0.75rem; font-size: 0.875rem; color: #f4f4f5; outline: none; } .input:focus { border-color: #52525b; box-shadow: 0 0 0 1px #3f3f46; }`}</style>
        </div>
      )}
    </AnimatePresence>
  );
}

function SearchField({
  label,
  value,
  matches,
  focused,
  onFocus,
  onBlur,
  onChange,
  onSelect,
}: {
  label: string;
  value: string;
  matches: string[];
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
        <input className="input" style={{ paddingLeft: "2.25rem" }} value={value} placeholder={`Search ${label.toLocaleLowerCase()}`} onFocus={onFocus} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} />
      </div>
      {focused && matches.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-1 shadow-xl">
          {matches.map((name) => (
            <button type="button" key={name} onMouseDown={() => onSelect(name)} className={cn("block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100", normalizeDishName(name) === normalizeDishName(value) && "bg-zinc-800 text-zinc-100")}>{name}</button>
          ))}
        </div>
      )}
    </div>
  );
}
