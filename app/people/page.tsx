"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Users, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { fetchDiners, refreshProfileStats } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import { bestDisplayName } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

export default function PeoplePage() {
  const { user } = useAuth();
  const configured = isFirebaseConfigured();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(configured);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    let active = true;

    // Make sure the signed-in user has a public profile doc, then load the
    // directory. This guarantees you appear in the list.
    const ensureSelf = user
      ? refreshProfileStats(
          user.uid,
          bestDisplayName({ displayName: user.displayName, email: user.email }),
          user.email ?? "",
          user.photoURL ?? ""
        ).catch(() => {})
      : Promise.resolve();

    setError(null);
    ensureSelf
      .then(() => fetchDiners())
      .then((p) => active && setProfiles(p))
      .catch((e) => {
        if (!active) return;
        const msg = e instanceof Error ? e.message : String(e);
        // Permission errors mean the public-read rules aren't published.
        if (/permission|insufficient/i.test(msg)) {
          setError(
            "Can’t read the directory. Publish the Firestore rules (public read) in the Firebase console."
          );
        } else {
          setError(msg);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [configured, user]);

  const filtered = useMemo(() => {
    // Merge the current signed-in user in, in case their profile write hasn't
    // propagated yet — so they always see themselves listed.
    const merged = [...profiles];
    if (user && !merged.some((p) => p.uid === user.uid)) {
      merged.push({
        uid: user.uid,
        displayName:
          user.displayName || (user.email ?? "").replace(/@.*/, "") || "Me",
        email: user.email ?? "",
        photoURL: user.photoURL ?? "",
        mealCount: 0,
        avgRating: 0,
      });
    }

    const q = query.trim().toLowerCase();
    const list = merged
      .filter((p) => p.uid)
      .sort((a, b) => b.mealCount - a.mealCount);
    if (!q) return list;
    return list.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }, [profiles, query, user]);

  return (
    <div className="space-y-6">
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
          <Users className="h-5 w-5 text-zinc-400" />
          People
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Browse everyone on Dining Log and explore their ratings.
        </p>
      </motion.header>

      {!configured ? (
        <div className="surface p-8 text-center text-sm text-zinc-500">
          The people directory needs Firebase configured. It’s unavailable in
          Demo Mode.
        </div>
      ) : (
        <>
          {error && (
            <div className="surface flex items-start gap-2 border-amber-500/30 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-sm text-zinc-300">{error}</p>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people by name or email…"
              className="field pl-10"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="surface p-8 text-center text-sm text-zinc-500">
              No people found yet.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((p, i) => (
                <PersonRow
                  key={p.uid}
                  profile={p}
                  index={i}
                  isSelf={p.uid === user?.uid}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PersonRow({
  profile,
  index,
  isSelf,
}: {
  profile: UserProfile;
  index: number;
  isSelf: boolean;
}) {
  const initials = (profile.displayName || profile.email || "?")
    .replace(/@.*/, "")
    .split(/[.\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        href={`/u/?id=${encodeURIComponent(profile.uid)}`}
        className="surface group flex items-center gap-3 p-4 transition-colors hover:border-zinc-700"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-300">
          {profile.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoURL} alt="" className="h-full w-full object-cover" />
          ) : (
            initials || "?"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {profile.displayName || "Anonymous Diner"}
            {isSelf && (
              <span className="ml-1.5 text-xs font-normal text-zinc-500">(you)</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {profile.mealCount} {profile.mealCount === 1 ? "meal" : "meals"} ·{" "}
            <span className="font-mono tabular-nums text-zinc-400">
              {profile.avgRating.toFixed(1)}
            </span>{" "}
            avg
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-300" />
      </Link>
    </motion.div>
  );
}
