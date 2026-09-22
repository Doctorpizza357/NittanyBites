"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { getFirebase, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { upsertUserProfile, fetchUserProfile } from "@/lib/firestore";
import { bestDisplayName } from "@/lib/utils";

function deriveName(u: User): string {
  return bestDisplayName({ displayName: u.displayName, email: u.email });
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(fb.auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Ensure a public profile exists (preserve existing stats via merge).
        try {
          const existing = await fetchUserProfile(u.uid);
          await upsertUserProfile({
            uid: u.uid,
            displayName: deriveName(u),
            email: u.email ?? "",
            photoURL: u.photoURL ?? "",
            mealCount: existing?.mealCount ?? 0,
            avgRating: existing?.avgRating ?? 0,
          });
        } catch {
          // Non-fatal: directory entry can be created later on first log.
        }
      }
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const fb = getFirebase();
    if (!fb) throw new Error("Firebase not configured");
    await signInWithPopup(fb.auth, googleProvider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const fb = getFirebase();
    if (!fb) throw new Error("Firebase not configured");
    await signInWithEmailAndPassword(fb.auth, email, password);
  }, []);

  const registerWithEmail = useCallback(
    async (email: string, password: string) => {
      const fb = getFirebase();
      if (!fb) throw new Error("Firebase not configured");
      await createUserWithEmailAndPassword(fb.auth, email, password);
    },
    []
  );

  const signOut = useCallback(async () => {
    const fb = getFirebase();
    if (!fb) return;
    await fbSignOut(fb.auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
