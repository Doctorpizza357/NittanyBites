import {
  collection,
  getDocs,
  writeBatch,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebase } from "./firebase";
import type { MealLog, DishRating, LogMealPayload } from "./types";
import type { ImportMeal } from "./importSchema";
import { getDayOfWeek } from "./utils";

const MEALS_COLLECTION = "meals";
const DISHES_COLLECTION = "dishes";

export interface FirestoreData {
  meals: MealLog[];
  dishes: DishRating[];
}

function mapMeal(id: string, data: Record<string, unknown>): MealLog {
  return {
    id,
    date: String(data.date ?? ""),
    day: String(data.day ?? ""),
    meal: String(data.meal ?? ""),
    location: String(data.location ?? ""),
    rating: Number(data.rating ?? 0),
    favorites: Array.isArray(data.favorites) ? (data.favorites as string[]) : [],
    dislikes: Array.isArray(data.dislikes) ? (data.dislikes as string[]) : [],
    notes: String(data.notes ?? ""),
  };
}

function mapDish(id: string, data: Record<string, unknown>): DishRating {
  return {
    id,
    date: String(data.date ?? ""),
    meal: String(data.meal ?? ""),
    dish: String(data.dish ?? ""),
    location: String(data.location ?? ""),
    category: String(data.category ?? ""),
    rating: Number(data.rating ?? 0),
    sentiment: String(data.sentiment ?? ""),
    notes: String(data.notes ?? ""),
  };
}

/** Read all meals + dishes owned by `uid` (the site owner). */
export async function fetchUserData(uid: string): Promise<FirestoreData> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");

  // Filter by ownerUid only (no orderBy) so no composite index is needed;
  // sorting is done client-side.
  const [mealSnap, dishSnap] = await Promise.all([
    getDocs(
      query(collection(fb.db, MEALS_COLLECTION), where("ownerUid", "==", uid))
    ),
    getDocs(
      query(collection(fb.db, DISHES_COLLECTION), where("ownerUid", "==", uid))
    ),
  ]);

  const byDateAsc = (a: { date: string }, b: { date: string }) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0;

  return {
    meals: mealSnap.docs.map((d) => mapMeal(d.id, d.data())).sort(byDateAsc),
    dishes: dishSnap.docs.map((d) => mapDish(d.id, d.data())).sort(byDateAsc),
  };
}

/**
 * Delete a meal and all dishes that belong to it (matched by date + meal),
 * scoped to the owner. Requires the owner uid for the dish query filter.
 */
export async function deleteMeal(
  uid: string,
  meal: { id?: string; date: string; meal: string }
): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");

  const batch = writeBatch(fb.db);

  if (meal.id) {
    batch.delete(doc(fb.db, MEALS_COLLECTION, meal.id));
  }

  // Remove dishes tied to this meal (same owner, date, and meal label).
  // Query by ownerUid only (no composite index), then match client-side.
  const dishSnap = await getDocs(
    query(collection(fb.db, DISHES_COLLECTION), where("ownerUid", "==", uid))
  );
  dishSnap.docs
    .filter((d) => {
      const data = d.data();
      return data.date === meal.date && data.meal === meal.meal;
    })
    .forEach((d) => batch.delete(d.ref));

  await batch.commit();
}

/** Delete a single dish by its doc id. */
export async function deleteDish(dishId: string): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");
  const batch = writeBatch(fb.db);
  batch.delete(doc(fb.db, DISHES_COLLECTION, dishId));
  await batch.commit();
}

/** Append one meal + N dishes owned by `uid` in a single batch. */
export async function addMealToFirestore(
  uid: string,
  payload: LogMealPayload
): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");

  const { mealLog, dishes } = payload;
  const day = getDayOfWeek(mealLog.date) || "";

  const batch = writeBatch(fb.db);

  const mealRef = doc(collection(fb.db, MEALS_COLLECTION));
  batch.set(mealRef, {
    ownerUid: uid,
    date: mealLog.date,
    day,
    meal: mealLog.meal,
    location: mealLog.location,
    rating: mealLog.rating,
    favorites: mealLog.favorites ?? [],
    dislikes: mealLog.dislikes ?? [],
    notes: mealLog.notes ?? "",
    createdAt: serverTimestamp(),
  });

  for (const d of dishes) {
    const dishRef = doc(collection(fb.db, DISHES_COLLECTION));
    batch.set(dishRef, {
      ownerUid: uid,
      date: mealLog.date,
      meal: mealLog.meal,
      dish: d.dish,
      location: mealLog.location,
      category: d.category,
      rating: d.rating,
      sentiment: d.sentiment,
      notes: d.notes ?? "",
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/** Import many meals (+ their dishes) at once from a validated JSON payload. */
export async function importMeals(
  uid: string,
  meals: ImportMeal[]
): Promise<{ meals: number; dishes: number }> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");

  let mealCount = 0;
  let dishCount = 0;

  // Chunk writes to stay under the 500-op Firestore batch limit.
  let batch = writeBatch(fb.db);
  let count = 0;
  const flush = async () => {
    if (count > 0) {
      await batch.commit();
      batch = writeBatch(fb.db);
      count = 0;
    }
  };

  for (const m of meals) {
    const day = getDayOfWeek(m.date) || "";
    const mealRef = doc(collection(fb.db, MEALS_COLLECTION));
    batch.set(mealRef, {
      ownerUid: uid,
      date: m.date,
      day,
      meal: m.meal,
      location: m.location,
      rating: m.rating,
      favorites: m.favorites ?? [],
      dislikes: m.dislikes ?? [],
      notes: m.notes ?? "",
      createdAt: serverTimestamp(),
    });
    mealCount += 1;
    count += 1;

    for (const d of m.dishes ?? []) {
      const dishRef = doc(collection(fb.db, DISHES_COLLECTION));
      batch.set(dishRef, {
        ownerUid: uid,
        date: m.date,
        meal: m.meal,
        dish: d.dish,
        location: m.location,
        category: d.category,
        rating: d.rating,
        sentiment: d.sentiment,
        notes: d.notes ?? "",
        createdAt: serverTimestamp(),
      });
      dishCount += 1;
      count += 1;
      if (count >= 400) await flush();
    }
    if (count >= 400) await flush();
  }
  await flush();

  return { meals: mealCount, dishes: dishCount };
}
