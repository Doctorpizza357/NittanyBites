"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Link2,
  Check,
  UserX,
} from "lucide-react";
import { useViewUserMeals } from "@/lib/useMeals";
import { fetchUserProfile } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useToast } from "./Toast";
import { MealTimeline } from "./MealTimeline";
import { RankingsList } from "./RankingsList";
import { TrendChart } from "./TrendChart";
import type { UserProfile } from "@/lib/types";

export function ProfileView({ uid }: { uid: string | null }) {
  const configured = isFirebaseConfigured();
  const { toast } = useToast();
  const { meals, dishes, isLoading } = useViewUserMeals(uid);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(configured && !!uid);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"Timeline" | "Rankings" | "Trends">("Timeline");

  useEffect(() => {
    if (!configured || !uid) {
      setProfileLoading(false);
      return;
    }
    let active = true;
    setProfileLoading(true);
    fetchUserProfile(uid)
      .then((p) => active && setProfile(p))
      .catch(() => {})
      .finally(() => active && setProfileLoading(false));
    return () => {
      active = false;
    };
  }, [configured, uid]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast("Shareable link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy link.", "error");
    }
  };

  if (!configured) {
    return (
      <EmptyState
        title="Unavailable in Demo Mode"
        message="Shared profiles require Firebase to be configured."
      />
    );
  }

  if (!uid) {
    return (
      <EmptyState
        title="No diner selected"
        message="This link is missing a user id."
      />
    );
  }

  const loading = isLoading || profileLoading;
  const displayName = profile?.displayName || "Diner";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/people/"
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" /> All people
        </Link>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Share"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
        </div>
      ) : !profile && meals.length === 0 && dishes.length === 0 ? (
        <EmptyState
          title="Diner not found"
          message="This person doesn’t exist or hasn’t logged any meals yet."
          icon={UserX}
        />
      ) : (
        <>
          <motion.header
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <Avatar profile={profile} name={displayName} />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Public dining ratings · read-only
              </p>
            </div>
          </motion.header>

          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
              {(["Timeline", "Rankings", "Trends"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    tab === t ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {tab === t && (
                    <motion.span
                      layoutId="profile-tab-active"
                      className="absolute inset-0 rounded-md bg-zinc-800"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{t}</span>
                </button>
              ))}
            </div>
          </div>

          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "Timeline" && <MealTimeline meals={meals} dishes={dishes} />}
            {tab === "Rankings" && <RankingsList dishes={dishes} />}
            {tab === "Trends" && <TrendChart meals={meals} />}
          </motion.div>
        </>
      )}
    </div>
  );
}

function Avatar({
  profile,
  name,
}: {
  profile: UserProfile | null;
  name: string;
}) {
  const initials = name
    .replace(/@.*/, "")
    .split(/[.\s_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-lg font-medium text-zinc-300">
      {profile?.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.photoURL} alt="" className="h-full w-full object-cover" />
      ) : (
        initials || "?"
      )}
    </div>
  );
}

function EmptyState({
  title,
  message,
  icon: Icon = UserX,
}: {
  title: string;
  message: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <Icon className="h-9 w-9 text-zinc-600" />
      <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      <p className="max-w-sm text-sm text-zinc-500">{message}</p>
      <Link
        href="/people/"
        className="mt-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
      >
        Browse people
      </Link>
    </div>
  );
}
