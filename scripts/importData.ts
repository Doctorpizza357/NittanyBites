/**
 * One-time import of your existing historical data into a Firebase account.
 *
 * Usage (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 *   $env:TARGET_EMAIL="you@psu.edu"      # or $env:TARGET_UID="..."
 *   npm run import-data
 *
 * Skips import if the target account already has meals (idempotent), unless
 * you pass --force.
 */
import { db } from "./admin";
import { resolveTargetUid } from "./admin";
import { writeMealsForUser, refreshProfile } from "./writeMeals";
import { initialMeals, initialDishes } from "../lib/seedData";

async function main() {
  const force = process.argv.includes("--force");
  const target = await resolveTargetUid();
  console.log(`Target: ${target.displayName} <${target.email}> (${target.uid})`);

  const existing = await db()
    .collection("meals")
    .where("ownerUid", "==", target.uid)
    .limit(1)
    .get();

  if (!existing.empty && !force) {
    console.log(
      "Account already has meals. Re-run with --force to import anyway. Aborting."
    );
    return;
  }

  const counts = await writeMealsForUser(
    target.uid,
    initialMeals,
    initialDishes
  );
  const stats = await refreshProfile(
    target.uid,
    target.displayName,
    target.email
  );

  console.log(
    `Imported ${counts.meals} meals and ${counts.dishes} dishes.\n` +
      `Profile updated: ${stats.mealCount} meals · ${stats.avgRating} avg.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
