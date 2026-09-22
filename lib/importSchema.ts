/**
 * JSON import contract for logging meals via natural language.
 *
 * Hand `LLM_PROMPT` + `JSON_SCHEMA` to an LLM, paste in your meal description,
 * and it returns an object matching `ImportPayload`. Paste that JSON into the
 * in-app importer to append it to your ratings.
 */

export interface ImportDish {
  dish: string;
  category: string; // Entree | Side | Dessert | Deli / Sub | Breakfast (free text ok)
  rating: number; // 1.0 - 10.0
  sentiment: string; // Favorite | Liked | Neutral | Disliked | Mixed
  notes?: string;
}

export interface ImportMeal {
  date: string; // ISO YYYY-MM-DD
  meal: string; // Lunch | Brunch | Dinner
  location: string; // e.g. Waring Commons, Redifer Commons
  rating: number; // 1.0 - 10.0 overall
  favorites?: string[];
  dislikes?: string[];
  notes?: string;
  dishes?: ImportDish[];
}

/** Top-level payload: one or many meals. */
export interface ImportPayload {
  meals: ImportMeal[];
}

/** The JSON Schema (draft-07) describing a valid ImportPayload. */
export const JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "DiningLogImport",
  type: "object",
  required: ["meals"],
  properties: {
    meals: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["date", "meal", "location", "rating"],
        properties: {
          date: {
            type: "string",
            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
            description: "ISO date YYYY-MM-DD. Use today's date if unspecified.",
          },
          meal: {
            type: "string",
            enum: ["Lunch", "Brunch", "Dinner", "Lunch (Brunch)"],
          },
          location: {
            type: "string",
            description:
              "Dining commons, e.g. 'Waring Commons' or 'Redifer Commons'.",
          },
          rating: {
            type: "number",
            minimum: 1,
            maximum: 10,
            description: "Overall meal rating, one decimal (e.g. 8.3).",
          },
          favorites: { type: "array", items: { type: "string" } },
          dislikes: { type: "array", items: { type: "string" } },
          notes: { type: "string", description: "Editorial summary of the meal." },
          dishes: {
            type: "array",
            items: {
              type: "object",
              required: ["dish", "category", "rating", "sentiment"],
              properties: {
                dish: { type: "string" },
                category: {
                  type: "string",
                  description:
                    "Entree, Side, Dessert, Deli / Sub, Breakfast (free text allowed).",
                },
                rating: { type: "number", minimum: 1, maximum: 10 },
                sentiment: {
                  type: "string",
                  enum: ["Favorite", "Liked", "Neutral", "Disliked", "Mixed"],
                },
                notes: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

/** Ready-to-paste instruction block for an LLM. */
export const LLM_PROMPT = `You convert casual descriptions of Penn State dining-hall meals into structured JSON.

Return ONLY a JSON object (no prose, no markdown fences) matching this shape:

{
  "meals": [
    {
      "date": "YYYY-MM-DD",              // today's date if not stated
      "meal": "Lunch | Brunch | Dinner",
      "location": "Waring Commons | Redifer Commons | ...",
      "rating": 8.3,                      // overall, 1.0–10.0
      "favorites": ["dish name", "..."], // optional
      "dislikes": ["thing", "..."],      // optional
      "notes": "one clean sentence summarizing the meal",
      "dishes": [
        {
          "dish": "Shrimp Ravioli",
          "category": "Entree",           // Entree | Side | Dessert | Deli / Sub | Breakfast
          "rating": 8.7,                   // 1.0–10.0
          "sentiment": "Favorite",         // Favorite | Liked | Neutral | Disliked | Mixed
          "notes": "rich lobster cream sauce"
        }
      ]
    }
  ]
}

Rules:
- Infer sensible categories and sentiments.
- Estimate a dish rating from the language if a number isn't given.
- Multiple meals in one description => multiple array entries.
- Output valid JSON only.`;

/**
 * Build an import-compatible payload from stored meals + dishes.
 * Dishes are matched to their meal by date + meal label.
 */
export function buildExportPayload(
  meals: {
    date: string;
    meal: string;
    location: string;
    rating: number;
    favorites?: string[];
    dislikes?: string[];
    notes?: string;
  }[],
  dishes: {
    date: string;
    meal: string;
    dish: string;
    category: string;
    rating: number;
    sentiment: string;
    notes?: string;
  }[]
): ImportPayload {
  return {
    meals: meals.map((m) => ({
      date: m.date,
      meal: m.meal,
      location: m.location,
      rating: m.rating,
      favorites: m.favorites ?? [],
      dislikes: m.dislikes ?? [],
      notes: m.notes ?? "",
      dishes: dishes
        .filter((d) => d.date === m.date && d.meal === m.meal)
        .map((d) => ({
          dish: d.dish,
          category: d.category,
          rating: d.rating,
          sentiment: d.sentiment,
          notes: d.notes ?? "",
        })),
    })),
  };
}

interface ValidationResult {
  ok: boolean;
  errors: string[];
  payload?: ImportPayload;
}

const MEAL_VALUES = ["lunch", "brunch", "dinner", "lunch (brunch)"];
const SENTIMENT_VALUES = ["favorite", "liked", "neutral", "disliked", "mixed"];

function clampRating(n: unknown): number | null {
  const v = typeof n === "number" ? n : parseFloat(String(n));
  if (!Number.isFinite(v)) return null;
  return Math.min(10, Math.max(1, Math.round(v * 10) / 10));
}

/** Validate + normalize parsed JSON into an ImportPayload. */
export function validateImport(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Top level must be a JSON object."] };
  }

  // Accept either { meals: [...] } or a bare array or a single meal object.
  let mealsRaw: unknown;
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.meals)) mealsRaw = obj.meals;
  else if (Array.isArray(raw)) mealsRaw = raw;
  else if (obj.date && obj.meal) mealsRaw = [raw];
  else return { ok: false, errors: ["Expected a 'meals' array."] };

  const meals = mealsRaw as unknown[];
  if (meals.length === 0) errors.push("No meals provided.");

  const normalized: ImportMeal[] = [];

  meals.forEach((m, i) => {
    if (typeof m !== "object" || m === null) {
      errors.push(`Meal #${i + 1} is not an object.`);
      return;
    }
    const meal = m as Record<string, unknown>;
    const where = `Meal #${i + 1}`;

    const date = String(meal.date ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      errors.push(`${where}: date must be YYYY-MM-DD.`);

    const mealName = String(meal.meal ?? "").trim();
    if (!MEAL_VALUES.includes(mealName.toLowerCase()))
      errors.push(`${where}: meal must be Lunch, Brunch, or Dinner.`);

    const location = String(meal.location ?? "").trim();
    if (!location) errors.push(`${where}: location is required.`);

    const rating = clampRating(meal.rating);
    if (rating === null) errors.push(`${where}: rating must be a number 1–10.`);

    const dishesRaw = Array.isArray(meal.dishes) ? meal.dishes : [];
    const dishes: ImportDish[] = [];
    dishesRaw.forEach((d, j) => {
      if (typeof d !== "object" || d === null) return;
      const dish = d as Record<string, unknown>;
      const name = String(dish.dish ?? "").trim();
      if (!name) {
        errors.push(`${where} dish #${j + 1}: name required.`);
        return;
      }
      const dRating = clampRating(dish.rating);
      if (dRating === null) {
        errors.push(`${where} dish #${j + 1}: rating must be 1–10.`);
        return;
      }
      let sentiment = String(dish.sentiment ?? "Neutral").trim();
      if (!SENTIMENT_VALUES.includes(sentiment.toLowerCase())) sentiment = "Neutral";
      dishes.push({
        dish: name,
        category: String(dish.category ?? "Entree").trim() || "Entree",
        rating: dRating,
        sentiment,
        notes: String(dish.notes ?? "").trim(),
      });
    });

    if (rating !== null && date && location && mealName) {
      normalized.push({
        date,
        meal: mealName,
        location,
        rating,
        favorites: Array.isArray(meal.favorites)
          ? meal.favorites.map((x) => String(x)).filter(Boolean)
          : [],
        dislikes: Array.isArray(meal.dislikes)
          ? meal.dislikes.map((x) => String(x)).filter(Boolean)
          : [],
        notes: String(meal.notes ?? "").trim(),
        dishes,
      });
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], payload: { meals: normalized } };
}
