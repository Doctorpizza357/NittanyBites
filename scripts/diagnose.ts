/**
 * Diagnostic: inspect what's actually stored in Firestore and compare it to
 * your Auth users. Helps explain why meals/dishes don't show in the UI.
 *
 * Usage (PowerShell):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccount.json"
 *   npm run diagnose
 *   # optionally focus one account:
 *   $env:TARGET_EMAIL="you@psu.edu"; npm run diagnose
 */
import { db, getAdmin } from "./admin";
import { getAuth } from "firebase-admin/auth";

async function main() {
  const firestore = db();

  // 1) List Auth users (uid ↔ email).
  console.log("=== Auth users ===");
  const authUsers = await getAuth(getAdmin()).listUsers(50);
  for (const u of authUsers.users) {
    console.log(`  uid=${u.uid}  email=${u.email ?? "(none)"}`);
  }

  // 2) Summarize meals by ownerUid.
  const collections = ["meals", "dishes"] as const;
  for (const name of collections) {
    const snap = await firestore.collection(name).get();
    console.log(`\n=== ${name}: ${snap.size} docs total ===`);

    const byOwner = new Map<string, number>();
    let missingOwner = 0;
    snap.forEach((d) => {
      const owner = d.data().ownerUid;
      if (owner === undefined || owner === null || owner === "") {
        missingOwner += 1;
      } else {
        byOwner.set(String(owner), (byOwner.get(String(owner)) ?? 0) + 1);
      }
    });

    for (const [owner, count] of byOwner) {
      console.log(`  ownerUid=${owner} → ${count} docs`);
    }
    if (missingOwner > 0) {
      console.log(`  ⚠ ${missingOwner} docs have NO ownerUid field`);
    }

    // Show one sample document's fields.
    const first = snap.docs[0];
    if (first) {
      console.log(`  sample fields: ${Object.keys(first.data()).join(", ")}`);
    }
  }

  // 3) If a target is given, count what the UI query would return for them.
  const email = process.env.TARGET_EMAIL;
  const uidEnv = process.env.TARGET_UID;
  if (email || uidEnv) {
    const auth = getAuth(getAdmin());
    const user = uidEnv
      ? await auth.getUser(uidEnv)
      : await auth.getUserByEmail(email!);
    console.log(`\n=== UI query simulation for ${user.email} (${user.uid}) ===`);
    for (const name of collections) {
      const q = await firestore
        .collection(name)
        .where("ownerUid", "==", user.uid)
        .get();
      console.log(`  ${name}: ${q.size} docs match ownerUid == ${user.uid}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("diagnose failed:", err);
    process.exit(1);
  });
