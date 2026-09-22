"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  UtensilsCrossed,
  Loader2,
  Mail,
  Lock,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useToast } from "./Toast";

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "That email is already registered. Try signing in.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed.";
    default:
      return err instanceof Error ? err.message : "Something went wrong.";
  }
}

export function LoginScreen() {
  const { signInWithGoogle, signInWithEmail, registerWithEmail } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") await signInWithEmail(email, password);
      else await registerWithEmail(email, password);
    } catch (err) {
      toast(friendlyError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
            <UtensilsCrossed className="h-6 w-6 text-zinc-300" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-zinc-100">
            Dining Log
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Sign in to track your Penn State dining.
          </p>
        </div>

        <div className="surface space-y-4 p-6">
          <button
            onClick={handleGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800/60 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600">or</span>
            <span className="h-px flex-1 bg-zinc-800" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@psu.edu"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-600"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-600"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "signin" ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-500">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() =>
                setMode((m) => (m === "signin" ? "register" : "signin"))
              }
              className="font-medium text-zinc-200 hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
