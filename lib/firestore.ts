import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebase } from "./firebase";
import type {
  MealLog,
  DishRating,
  LogMealPayload,
  UserProfile,
} from "./types";
import { getDayOfWeek, round1 } from "./utils";

const MEALS_COLLECTION = "meals";
const DISHES_COLLECTION = "dishes";
const USERS_COLLECTION = "users";

export interface FirestoreData {
  meals: MealLog[];
  dishes: DishRating[];
}

function mapMeal(data: Record<string, unknown>): MealLog {
  return {
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

function mapDish(data: Record<string, unknown>): DishRating {
  return {
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

/** Read meals + dishes owned by a specific user. */
export async function fetchUserData(uid: string): Promise<FirestoreData> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");

  // Note: we intentionally filter by ownerUid only (no orderBy) so this works
  // WITHOUT a Firestore composite index. Sorting is done client-side below.
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
    meals: mealSnap.docs.map((d) => mapMeal(d.data())).sort(byDateAsc),
    dishes: dishSnap.docs.map((d) => mapDish(d.data())).sort(byDateAsc),
  };
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

/** Seed a user's account with the initial historical data (first run). */
export async function seedUserData(
  uid: string,
  meals: MealLog[],
  dishes: DishRating[]
): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");

  const batch = writeBatch(fb.db);
  for (const m of meals) {
    const ref = doc(collection(fb.db, MEALS_COLLECTION));
    batch.set(ref, { ...m, ownerUid: uid, createdAt: serverTimestamp() });
  }
  for (const d of dishes) {
    const ref = doc(collection(fb.db, DISHES_COLLECTION));
    batch.set(ref, { ...d, ownerUid: uid, createdAt: serverTimestamp() });
  }
  await batch.commit();
}

/* ---------- user profiles / directory ---------- */

function mapProfile(data: Record<string, unknown>): UserProfile {
  return {
    uid: String(data.uid ?? ""),
    displayName: String(data.displayName ?? ""),
    email: String(data.email ?? ""),
    photoURL: String(data.photoURL ?? ""),
    mealCount: Number(data.mealCount ?? 0),
    avgRating: Number(data.avgRating ?? 0),
    updatedAt: typeof data.updatedAt === "number" ? (data.updatedAt as number) : undefined,
  };
}

/**
 * Create or update a user's public profile. Called on sign-in and after
 * logging a meal so the directory stays current.
 */
export async function upsertUserProfile(profile: {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  mealCount: number;
  avgRating: number;
}): Promise<void> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");

  await setDoc(
    doc(fb.db, USERS_COLLECTION, profile.uid),
    { ...profile, updatedAt: Date.now() },
    { merge: true }
  );
}

/** Recompute a user's meal count + average and persist it to their profile. */
export async function refreshProfileStats(
  uid: string,
  displayName: string,
  email: string,
  photoURL: string
): Promise<void> {
  const { meals } = await fetchUserData(uid);
  const mealCount = meals.length;
  const avgRating =
    mealCount > 0
      ? round1(meals.reduce((a, m) => a + m.rating, 0) / mealCount)
      : 0;
  await upsertUserProfile({
    uid,
    displayName,
    email,
    photoURL,
    mealCount,
    avgRating,
  });
}

/** Fetch a single public profile by uid. */
export async function fetchUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");
  const snap = await getDoc(doc(fb.db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return mapProfile(snap.data());
}

/** List all public profiles for the people directory. */
export async function fetchAllProfiles(): Promise<UserProfile[]> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");
  const snap = await getDocs(collection(fb.db, USERS_COLLECTION));
  return snap.docs.map((d) => mapProfile(d.data()));
}

/**
 * Build the diner directory from ACTUAL meal data (source of truth), enriched
 * with profile info where available. This guarantees anyone who has logged
 * meals appears — even if their `users/{uid}` profile doc is missing or stale.
 */
export async function fetchDiners(): Promise<UserProfile[]> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");

  const [mealSnap, profileSnap] = await Promise.all([
    getDocs(collection(fb.db, MEALS_COLLECTION)),
    getDocs(collection(fb.db, USERS_COLLECTION)),
  ]);

  const profiles = new Map<string, UserProfile>();
  profileSnap.docs.forEach((d) => {
    const p = mapProfile({ ...d.data(), uid: d.data().uid ?? d.id });
    if (p.uid) profiles.set(p.uid, p);
  });

  // Aggregate meal stats per owner.
  const agg = new Map<string, { sum: number; count: number }>();
  mealSnap.docs.forEach((d) => {
    const owner = d.data().ownerUid;
    if (!owner) return;
    const key = String(owner);
    const cur = agg.get(key) ?? { sum: 0, count: 0 };
    cur.sum += Number(d.data().rating ?? 0);
    cur.count += 1;
    agg.set(key, cur);
  });

  // Union of everyone who has a profile OR has meals.
  const uids = new Set<string>([...profiles.keys(), ...agg.keys()]);

  const diners: UserProfile[] = [];
  for (const uid of uids) {
    const profile = profiles.get(uid);
    const stats = agg.get(uid);
    const mealCount = stats?.count ?? profile?.mealCount ?? 0;
    const avgRating = stats
      ? round1(stats.sum / stats.count)
      : profile?.avgRating ?? 0;

    const name =
      profile?.displayName ||
      (profile?.email ? profile.email.replace(/@.*/, "") : "") ||
      "Anonymous Diner";

    diners.push({
      uid,
      displayName: name,
      email: profile?.email ?? "",
      photoURL: profile?.photoURL ?? "",
      mealCount,
      avgRating,
      updatedAt: profile?.updatedAt,
    });
  }

  return diners;
}
