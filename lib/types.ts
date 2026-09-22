export type MealType =
  | "Lunch"
  | "Brunch"
  | "Dinner"
  | "Lunch (Brunch)";

export type Location =
  | "Waring Commons (West)"
  | "Waring Commons"
  | "Redifer Commons"
  | "Redifer Commons (On a Roll)"
  | "Pollock Commons"
  | "East Food District"
  | "North Food District"
  | "HUB Dining";

export type Sentiment =
  | "Favorite"
  | "Liked"
  | "Neutral"
  | "Disliked"
  | "Mixed";

export type DishCategory =
  | "Entree"
  | "Side"
  | "Dessert"
  | "Deli / Sub"
  | "Breakfast"
  | string;

export interface MealLog {
  id?: string; // Firestore doc id (present when loaded from Firestore)
  date: string;
  day: string;
  meal: string;
  location: string;
  rating: number;
  favorites: string[];
  dislikes: string[];
  notes: string;
}

export interface DishRating {
  id?: string; // Firestore doc id (present when loaded from Firestore)
  date: string;
  meal: string;
  dish: string;
  location: string;
  category: string;
  rating: number;
  sentiment: string;
  notes: string;
}

export interface MealsApiResponse {
  meals: MealLog[];
  dishes: DishRating[];
  demoMode: boolean;
}

/** Form input shapes used by the Log Meal modal. */
export interface DishFormInput {
  dish: string;
  category: string;
  rating: number;
  sentiment: Sentiment;
  notes: string;
}

export interface MealFormInput {
  date: string;
  meal: string;
  location: string;
  rating: number;
  favorites: string[];
  dislikes: string[];
  notes: string;
}

export interface LogMealPayload {
  mealLog: MealFormInput;
  dishes: DishFormInput[];
}

export type Tier = "S" | "A" | "B" | "D";

/** Public profile stored in `users/{uid}`. Powers the people directory. */
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  mealCount: number;
  avgRating: number;
  updatedAt?: number;
}
