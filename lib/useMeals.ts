"use client";

import useSWR from "swr";
import type { MealsApiResponse } from "./types";
import { initialMeals, initialDishes } from "./seedData";
import { isFirebaseConfigured, OWNER_UID } from "./firebase";
import { fetchUserData } from "./firestore";

const demoFallback: MealsApiResponse = {
  meals: initialMeals,
  dishes: initialDishes,
  demoMode: true,
};

/**
 * Loads the SITE OWNER's meals + dishes. Everyone sees the same data (this is
 * a single-owner rating site); only the owner can write.
 * - Firebase unconfigured, or no OWNER_UID set → seed data in demo mode.
 */
export function useMeals() {
  const configured = isFirebaseConfigured();
  const canFetch = configured && Boolean(OWNER_UID);
  const key = canFetch ? ["meals", OWNER_UID] : "demo";

  const fetcher = async (): Promise<MealsApiResponse> => {
    if (!canFetch) return demoFallback;
    const { meals, dishes } = await fetchUserData(OWNER_UID);
    return { meals, dishes, demoMode: false };
  };

  const { data, error, isLoading, mutate } = useSWR<MealsApiResponse>(
    key,
    fetcher,
    {
      fallbackData: !canFetch ? demoFallback : undefined,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  return {
    meals: data?.meals ?? [],
    dishes: data?.dishes ?? [],
    demoMode: data?.demoMode ?? !canFetch,
    isLoading,
    error,
    mutate,
  };
}
