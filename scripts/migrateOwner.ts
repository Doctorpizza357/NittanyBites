/**
 * Backfill / reassign the `ownerUid` on meals + dishes so they show up in the
 * UI for the intended account.
 *
 * Usage (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 *   $env:TARGET_EMAIL="you@psu.edu"        # or TARGET_UID
 *
 *   # Assign ALL docs that are missing an ownerUid to the target:
 *   npm run migrate-owner
 *
 *   # Reassign docs currently owned by a specific (wrong) uid:
 *   $env:FROM_UID="old-or-wrong-uid"; npm run migrate-owner
 *
 *   # Assign EVERY doc to the target (use with care):
 *   npm run migrate-owner -- --all
 */
import { db } from "./admin";
import { resolveTargetUid } from "./admin";
import { refreshProfile } from "./writeMeals";

async function migrateCollection(
  name: "meals" | "dishes",
  targetUid: string,
  mode: "missing" | "from" | "all",
  fromUid?: string
): Promise<number> {
  const firestore = db();
  const snap = await firestore.collection(name).get();

  let updated = 0;
  let batch = firestore.batch();
  let ops = 0;

  for (const docSnap of snap.docs) {
    const owner = docSnap.data().ownerUid;
    const shouldUpdate =
      mode === "all"
        ? true
        : mode === "from"
          ? String(owner ?? "") === fromUid
          : owner === undefined || owner === null || owner === "";

    if (!shouldUpdate) continue;

    batch.update(docSnap.ref, { ownerUid: targetUid });
    updated += 1;
    ops += 1;

    // Firestore batches cap at 500 writes.
    if (ops >= 450) {
      await batch.commit();
      batch = firestore.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  return updated;
}

async function main() {
  const all = process.argv.includes("--all");
  const fromUid = process.env.FROM_UID;
  const mode: "missing" | "from" | "all" = all
    ? "all"
    : fromUid
      ? "from"
      : "missing";

  const target = await resolveTargetUid();
  console.log(
    `Target: ${target.displayName} <${target.email}> (${target.uid})`
  );
  console.log(`Mode: ${mode}${fromUid ? ` (from ${fromUid})` : ""}`);

  const meals = await migrateCollection("meals", target.uid, mode, fromUid);
  const dishes = await migrateCollection("dishes", target.uid, mode, fromUid);

  const stats = await refreshProfile(
    target.uid,
    target.displayName,
    target.email
  );

  console.log(
    `Reassigned ${meals} meals and ${dishes} dishes to ${target.uid}.\n` +
      `Profile updated: ${stats.mealCount} meals · ${stats.avgRating} avg.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("migrate-owner failed:", err);
    process.exit(1);
  });
