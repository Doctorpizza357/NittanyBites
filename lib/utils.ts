import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Tier } from "./types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Map a numeric rating (0-10) to a tier band. */
export function getTier(rating: number): Tier {
  if (rating >= 9.0) return "S";
  if (rating >= 8.5) return "A";
  if (rating >= 7.0) return "B";
  return "D";
}

export const tierStyles: Record<Tier, string> = {
  S: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  A: "bg-sapphire/15 text-sky-300 border-sapphire/40",
  B: "bg-emerald/15 text-emerald-300 border-emerald/40",
  D: "bg-rose/15 text-rose-300 border-rose/40",
};

export const tierLabels: Record<Tier, string> = {
  S: "S-Tier",
  A: "A-Tier",
  B: "B-Tier",
  D: "Avoid",
};

/** Color-code a rating pill by score band. */
export function ratingColor(rating: number): string {
  if (rating >= 8.0) return "text-green-300 border-green-500/50 bg-green-500/10";
  if (rating >= 5.0) return "text-yellow-300 border-yellow-500/50 bg-yellow-500/10";
  return "text-red-300 border-red-500/50 bg-red-500/10";
}

export function sentimentColor(sentiment: string): string {
  const s = sentiment.toLowerCase();
  if (s === "favorite") return "bg-emerald/15 text-emerald-300 border-emerald/40";
  if (s === "liked") return "bg-sky-500/15 text-sky-300 border-sky-500/40";
  if (s === "disliked") return "bg-rose/15 text-rose-300 border-rose/40";
  if (s === "mixed") return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  return "bg-slate-500/15 text-slate-300 border-slate-500/40";
}

/** Normalize a full location string to a short commons name. */
export function normalizeCommons(location: string): string {
  const l = location.toLowerCase();
  if (l.includes("waring")) return "Waring Commons";
  if (l.includes("redifer")) return "Redifer Commons";
  if (l.includes("pollock")) return "Pollock Commons";
  if (l.includes("east")) return "East Food District";
  if (l.includes("north")) return "North Food District";
  if (l.includes("hub")) return "HUB Dining";
  return location;
}

/** Simplify a meal label into Lunch / Dinner / Brunch buckets. */
export function normalizeMeal(meal: string): "Lunch" | "Dinner" | "Brunch" | "Other" {
  const m = meal.toLowerCase();
  if (m.includes("dinner")) return "Dinner";
  if (m.includes("brunch")) return "Brunch";
  if (m.includes("lunch")) return "Lunch";
  return "Other";
}

/** Map a free-form category into a top-level grouping. */
export function normalizeCategory(
  category: string
): "Entrees" | "Deli / Subs" | "Sides" | "Desserts" | "Breakfast" {
  const c = category.toLowerCase();
  if (c.includes("deli") || c.includes("sub")) return "Deli / Subs";
  if (c.includes("dessert")) return "Desserts";
  if (c.includes("breakfast")) return "Breakfast";
  if (c.includes("side")) return "Sides";
  return "Entrees";
}

export function getDayOfWeek(dateStr: string): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return days[d.getDay()];
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Map scores to red (bad), yellow (mid), and green (high) ranges. */
export function scoreAccent(rating: number): string {
  const score = Math.min(10, Math.max(1, Math.floor(rating)));
  const colors = [
    "border-red-700/50 bg-red-700/10 text-red-300",
    "border-red-600/50 bg-red-600/10 text-red-300",
    "border-red-500/50 bg-red-500/10 text-red-300",
    "border-red-400/50 bg-red-400/10 text-red-300",
    "border-yellow-600/50 bg-yellow-600/10 text-yellow-300",
    "border-yellow-500/50 bg-yellow-500/10 text-yellow-300",
    "border-yellow-400/50 bg-yellow-400/10 text-yellow-300",
    "border-green-600/50 bg-green-600/10 text-green-300",
    "border-green-500/50 bg-green-500/10 text-green-300",
    "border-green-400/50 bg-green-400/10 text-green-300",
  ];
  return colors[score - 1];
}

/** Placeholder names that should never override a real derived name. */
const PLACEHOLDER_NAMES = new Set(["diner", "me", "anonymous diner", ""]);

/**
 * Best display name for a user, ignoring stored placeholder values.
 * Priority: explicit non-placeholder displayName → email prefix → "Anonymous".
 */
export function bestDisplayName(opts: {
  displayName?: string | null;
  email?: string | null;
}): string {
  const dn = (opts.displayName ?? "").trim();
  if (dn && !PLACEHOLDER_NAMES.has(dn.toLowerCase())) return dn;
  const email = (opts.email ?? "").trim();
  if (email) return email.replace(/@.*/, "");
  return "Anonymous";
}
