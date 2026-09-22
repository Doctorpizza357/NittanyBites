/**
 * Firebase Admin SDK bootstrap for server-side scripts.
 *
 * The Admin SDK bypasses Firestore Security Rules, so these scripts can write
 * to any user's data. Keep the service account key OUT of the repo and the
 * client bundle — it is a real secret.
 *
 * Credentials are loaded from either:
 *   1. GOOGLE_APPLICATION_CREDENTIALS = path to the service-account JSON, or
 *   2. FIREBASE_SERVICE_ACCOUNT       = the JSON contents as a single string.
 */
import * as fs from "node:fs";
import { initializeApp, cert, getApps, type App, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config(); // also load .env if present

function loadServiceAccount(): ServiceAccount {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) {
    return JSON.parse(inline) as ServiceAccount;
  }

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path && fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path, "utf8")) as ServiceAccount;
  }

  throw new Error(
    "Missing Firebase Admin credentials. Set GOOGLE_APPLICATION_CREDENTIALS " +
      "to your service-account JSON path, or FIREBASE_SERVICE_ACCOUNT to its contents."
  );
}

let app: App | null = null;

export function getAdmin(): App {
  if (app) return app;
  app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(loadServiceAccount()) });
  return app;
}

export function db(): Firestore {
  return getFirestore(getAdmin());
}

export { FieldValue };

/** Resolve a target user's uid: prefer TARGET_UID, else look up TARGET_EMAIL. */
export async function resolveTargetUid(): Promise<{
  uid: string;
  email: string;
  displayName: string;
}> {
  const auth = getAuth(getAdmin());

  const uidEnv = process.env.TARGET_UID;
  if (uidEnv) {
    const user = await auth.getUser(uidEnv);
    return {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? (user.email ?? "").replace(/@.*/, ""),
    };
  }

  const emailEnv = process.env.TARGET_EMAIL;
  if (emailEnv) {
    const user = await auth.getUserByEmail(emailEnv);
    return {
      uid: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? (user.email ?? "").replace(/@.*/, ""),
    };
  }

  throw new Error(
    "Set TARGET_UID (Firebase Auth uid) or TARGET_EMAIL to choose whose account to write to."
  );
}
