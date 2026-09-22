/**
 * AI meal logger — parse a natural-language description with Google Gemini
 * and write the structured meal + dishes into Firestore.
 *
 * Setup:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 *   $env:GEMINI_API_KEY="your-gemini-key"     # from aistudio.google.com
 *   $env:TARGET_EMAIL="you@psu.edu"           # or $env:TARGET_UID="..."
 *
 * Usage:
 *   npm run log-meal -- "Dinner at Waring tonight, 8.3. Shrimp ravioli was
 *     amazing (8.7), brisket was dry at first (6.8). Loved the ravioli."
 *
 *   # or pipe / pass a longer note:
 *   npm run log-meal -- --dry "Lunch at Redifer, custom Italian sub 8.7..."
 *
 * Flags:
 *   --dry   Parse and print JSON only; do not write to Firestore.
 */
import { GoogleGenAI, Type } from "@google/genai";
import { resolveTargetUid } from "./admin";
import { writeMealsForUser, refreshProfile } from "./writeMeals";
import type { MealLog, DishRating } from "../lib/types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const LOCATIONS = [
  "Waring Commons",
  "Redifer Commons",
  "Pollock Commons",
  "East Food District",
  "North Food District",
  "HUB Dining",
];

const CATEGORIES = ["Entree", "Side", "Dessert", "Deli / Sub", "Breakfast"];
const SENTIMENTS = ["Favorite", "Liked", "Neutral", "Disliked", "Mixed"];

/** Response schema Gemini must conform to (structured output). */
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    date: {
      type: Type.STRING,
      description: "ISO date YYYY-MM-DD. If not stated, use today's date.",
    },
    meal: {
      type: Type.STRING,
      description: "One of: Lunch, Brunch, Dinner (or 'Lunch (Brunch)').",
    },
    location: {
      type: Type.STRING,
      description: `Dining location, ideally one of: ${LOCATIONS.join(", ")}.`,
    },
    rating: {
      type: Type.NUMBER,
      description: "Overall meal rating from 1.0 to 10.0.",
    },
    favorites: { type: Type.ARRAY, items: { type: Type.STRING } },
    dislikes: { type: Type.ARRAY, items: { type: Type.STRING } },
    notes: {
      type: Type.STRING,
      description: "A clean editorial summary of the meal.",
    },
    dishes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dish: { type: Type.STRING },
          category: {
            type: Type.STRING,
            description: `One of: ${CATEGORIES.join(", ")}.`,
          },
          rating: { type: Type.NUMBER },
          sentiment: {
            type: Type.STRING,
            description: `One of: ${SENTIMENTS.join(", ")}.`,
          },
          notes: { type: Type.STRING },
        },
        required: ["dish", "category", "rating", "sentiment"],
      },
    },
  },
  required: ["date", "meal", "location", "rating", "dishes"],
};

interface ParsedMeal {
  date: string;
  meal: string;
  location: string;
  rating: number;
  favorites?: string[];
  dislikes?: string[];
  notes?: string;
  dishes: {
    dish: string;
    category: string;
    rating: number;
    sentiment: string;
    notes?: string;
  }[];
}

async function parseWithGemini(text: string): Promise<ParsedMeal> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Set GEMINI_API_KEY (get one at https://aistudio.google.com/apikey).");
  }

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toISOString().slice(0, 10);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `Today's date is ${today}. Extract a structured dining log from ` +
              `this note. Infer sensible categories/sentiments. If a dish rating ` +
              `is missing, estimate from the language. Note:\n\n"${text}"`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.2,
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Gemini returned an empty response.");
  return JSON.parse(raw) as ParsedMeal;
}

function toMealLog(p: ParsedMeal): MealLog {
  return {
    date: p.date,
    day: "",
    meal: p.meal,
    location: p.location,
    rating: p.rating,
    favorites: p.favorites ?? [],
    dislikes: p.dislikes ?? [],
    notes: p.notes ?? "",
  };
}

function toDishes(p: ParsedMeal): DishRating[] {
  return (p.dishes ?? []).map((d) => ({
    date: p.date,
    meal: p.meal,
    dish: d.dish,
    location: p.location,
    category: d.category,
    rating: d.rating,
    sentiment: d.sentiment,
    notes: d.notes ?? "",
  }));
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const text = args.filter((a) => !a.startsWith("--")).join(" ").trim();

  if (!text) {
    console.error('Provide a description, e.g. npm run log-meal -- "Dinner at Waring, 8.3..."');
    process.exit(1);
  }

  console.log("Parsing with Gemini…");
  const parsed = await parseWithGemini(text);

  const meal = toMealLog(parsed);
  const dishes = toDishes(parsed);

  console.log(JSON.stringify({ meal, dishes }, null, 2));

  if (dry) {
    console.log("\n--dry set: not writing to Firestore.");
    return;
  }

  const target = await resolveTargetUid();
  const counts = await writeMealsForUser(target.uid, [meal], dishes);
  const stats = await refreshProfile(
    target.uid,
    target.displayName,
    target.email
  );

  console.log(
    `\nLogged ${counts.meals} meal + ${counts.dishes} dishes for ` +
      `${target.displayName}. Profile now: ${stats.mealCount} meals · ${stats.avgRating} avg.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("log-meal failed:", err);
    process.exit(1);
  });
