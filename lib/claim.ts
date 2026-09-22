"use client";

import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { getFirebase } from "./firebase";

const isUnclaimed = (v: unknown) => v === undefined || v === null || v === "";

/** Count meals + dishes that have no ownerUid (legacy/imported data). */
export async function countUnownedDocs(): Promise<number> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");

  const [mealSnap, dishSnap] = await Promise.all([
    getDocs(collection(fb.db, "meals")),
    getDocs(collection(fb.db, "dishes")),
  ]);

  let n = 0;
  mealSnap.docs.forEach((d) => isUnclaimed(d.data().ownerUid) && (n += 1));
  dishSnap.docs.forEach((d) => isUnclaimed(d.data().ownerUid) && (n += 1));
  return n;
}

/**
 * Claim every meal/dish that currently has no ownerUid, assigning it to `uid`.
 * Safe: the rules only permit stamping YOUR uid onto unclaimed docs.
 * Returns how many docs were claimed.
 */
export async function claimUnownedDocs(uid: string): Promise<number> {
  const fb = getFirebase();
  if (!fb) throw new Error("Firebase not configured");

  const [mealSnap, dishSnap] = await Promise.all([
    getDocs(collection(fb.db, "meals")),
    getDocs(collection(fb.db, "dishes")),
  ]);

  const targets: { col: "meals" | "dishes"; id: string }[] = [];
  mealSnap.docs.forEach((d) => {
    if (isUnclaimed(d.data().ownerUid)) targets.push({ col: "meals", id: d.id });
  });
  dishSnap.docs.forEach((d) => {
    if (isUnclaimed(d.data().ownerUid)) targets.push({ col: "dishes", id: d.id });
  });

  // Commit in chunks (Firestore batch limit is 500 writes).
  let claimed = 0;
  for (let i = 0; i < targets.length; i += 400) {
    const chunk = targets.slice(i, i + 400);
    const batch = writeBatch(fb.db);
    for (const t of chunk) {
      batch.update(doc(fb.db, t.col, t.id), { ownerUid: uid });
    }
    await batch.commit();
    claimed += chunk.length;
  }
  return claimed;
}
