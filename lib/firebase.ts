import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase web config. These values are NOT secrets — they identify your
 * project to Google's servers. Access is enforced by Firebase Auth +
 * Firestore Security Rules, so it is safe to ship them in the client bundle.
 *
 * Provide them via NEXT_PUBLIC_* env vars (baked in at build time).
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when the minimum required Firebase config is present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  );
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

/** Lazily initialize Firebase (client-side only). Returns null if unconfigured. */
export function getFirebase(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
} | null {
  if (typeof window === "undefined") return null;
  if (!isFirebaseConfigured()) return null;

  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  }
  return { app: app!, auth: authInstance!, db: dbInstance! };
}

export const googleProvider = new GoogleAuthProvider();
