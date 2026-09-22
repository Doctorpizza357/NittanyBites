/** Shared Admin-SDK writers for scripts (import + AI logger). */
import { db, FieldValue } from "./admin";
import type { MealLog, DishRating } from "../lib/types";

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function dayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d.getTime()) ? "" : days[d.getDay()];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Write meals + dishes for a user via a batched commit. Returns counts. */
export async function writeMealsForUser(
  uid: string,
  meals: MealLog[],
  dishes: DishRating[]
): Promise<{ meals: number; dishes: number }> {
  const firestore = db();
  const batch = firestore.batch();

  for (const m of meals) {
    const ref = firestore.collection("meals").doc();
    batch.set(ref, {
      ownerUid: uid,
      date: m.date,
      day: m.day || dayOfWeek(m.date),
      meal: m.meal,
      location: m.location,
      rating: m.rating,
      favorites: m.favorites ?? [],
      dislikes: m.dislikes ?? [],
      notes: m.notes ?? "",
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  for (const d of dishes) {
    const ref = firestore.collection("dishes").doc();
    batch.set(ref, {
      ownerUid: uid,
      date: d.date,
      meal: d.meal,
      dish: d.dish,
      location: d.location,
      category: d.category,
      rating: d.rating,
      sentiment: d.sentiment,
      notes: d.notes ?? "",
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  return { meals: meals.length, dishes: dishes.length };
}

/** Recompute and persist a user's public profile stats from all their meals. */
export async function refreshProfile(
  uid: string,
  displayName: string,
  email: string,
  photoURL = ""
): Promise<{ mealCount: number; avgRating: number }> {
  const firestore = db();
  const snap = await firestore
    .collection("meals")
    .where("ownerUid", "==", uid)
    .get();

  const ratings = snap.docs.map((d) => Number(d.data().rating ?? 0));
  const mealCount = ratings.length;
  const avgRating =
    mealCount > 0 ? round1(ratings.reduce((a, b) => a + b, 0) / mealCount) : 0;

  await firestore
    .collection("users")
    .doc(uid)
    .set(
      { uid, displayName, email, photoURL, mealCount, avgRating, updatedAt: Date.now() },
      { merge: true }
    );

  return { mealCount, avgRating };
}
