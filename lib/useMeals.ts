"use client";

import useSWR from "swr";
import type { MealsApiResponse } from "./types";
import { initialMeals, initialDishes } from "./seedData";
import { isFirebaseConfigured } from "./firebase";
import { fetchUserData, seedUserData } from "./firestore";

const demoFallback: MealsApiResponse = {
  meals: initialMeals,
  dishes: initialDishes,
  demoMode: true,
};

/**
 * Loads the signed-in user's own meals + dishes.
 * - Firebase unconfigured → seed data in demo mode.
 * - Configured + empty account → auto-seeds the starter history.
 *
 * @param uid   The current user's uid (null when signed out / demo).
 * @param seed  Whether to auto-seed an empty account (own dashboard only).
 */
export function useMeals(uid: string | null, seed: boolean = true) {
  const configured = isFirebaseConfigured();
  const key = !configured ? "demo" : uid ? ["meals", uid] : null;

  const fetcher = async (): Promise<MealsApiResponse> => {
    if (!configured) return demoFallback;
    if (!uid) return { meals: [], dishes: [], demoMode: false };

    // Let errors propagate to SWR (surfaced in the UI) instead of hiding them.
    let { meals, dishes } = await fetchUserData(uid);

    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[useMeals] uid=${uid} → ${meals.length} meals, ${dishes.length} dishes`
      );
    }

    // Only auto-seed brand-new accounts. If seeding fails (e.g. rules), throw
    // so the real error is visible rather than masked by demo data.
    if (seed && meals.length === 0 && dishes.length === 0) {
      await seedUserData(uid, initialMeals, initialDishes);
      const seeded = await fetchUserData(uid);
      meals = seeded.meals;
      dishes = seeded.dishes;
    }

    return { meals, dishes, demoMode: false };
  };

  const { data, error, isLoading, mutate } = useSWR<MealsApiResponse>(
    key,
    fetcher,
    {
      fallbackData: !configured ? demoFallback : undefined,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  return {
    meals: data?.meals ?? [],
    dishes: data?.dishes ?? [],
    demoMode: data?.demoMode ?? !configured,
    isLoading,
    error,
    mutate,
  };
}

/** Read-only view of another user's meals + dishes (for shared profiles). */
export function useViewUserMeals(uid: string | null) {
  const configured = isFirebaseConfigured();
  const key = configured && uid ? ["view-meals", uid] : null;

  const fetcher = async (): Promise<MealsApiResponse> => {
    if (!configured || !uid) return { meals: [], dishes: [], demoMode: false };
    const { meals, dishes } = await fetchUserData(uid);
    return { meals, dishes, demoMode: false };
  };

  const { data, error, isLoading } = useSWR<MealsApiResponse>(key, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    meals: data?.meals ?? [],
    dishes: data?.dishes ?? [],
    isLoading,
    error,
  };
}
