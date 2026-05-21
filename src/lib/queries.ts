import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ensureHousehold } from "@/lib/household";
import { weekStartYmd, parseYmd, ymd } from "@/lib/date";

export function useHouseholdId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["householdId", user?.id],
    enabled: !!user,
    queryFn: () => ensureHousehold(user!.id),
  });
}

export function useMemberKind(householdId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["memberKind", householdId, user?.id],
    enabled: !!householdId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("household_members")
        .select("member_kind")
        .eq("household_id", householdId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return ((data as any)?.member_kind ?? "adult") as "adult" | "child";
    },
  });
}

export function useHouseholdMembers(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ["householdMembers", householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data } = await supabase
        .from("household_members")
        .select("*")
        .eq("household_id", householdId!);
      if (!data?.length) return [];
      const ids = data.map((m: any) => m.user_id);
      const { data: profs } = await supabase
        .from("profiles").select("id,display_name").in("id", ids);
      return data.map((m: any) => ({
        ...m,
        display_name: profs?.find((p) => p.id === m.user_id)?.display_name,
      }));
    },
  });
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });
}

export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["isAdmin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("is_current_user_admin");
      return !!data;
    },
  });
}

export function useIsOwner() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["isOwner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("is_current_user_owner");
      return !!data;
    },
  });
}

export function usePreferences(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ["prefs", householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("household_id", householdId!)
        .maybeSingle();
      return data;
    },
  });
}

export function useFoodItems(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ["food", householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data } = await supabase
        .from("food_items")
        .select("*")
        .eq("household_id", householdId!)
        .order("expires_on", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });
}

export function usePantries(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ["pantries", householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data } = await supabase
        .from("pantries")
        .select("*")
        .eq("household_id", householdId!)
        .order("created_at");
      return data ?? [];
    },
  });
}

export function useSavedRecipes(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ["recipes", householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data } = await supabase
        .from("recipes")
        .select("*, recipe_ingredients(*)")
        .eq("household_id", householdId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useRecipeFeedback() {
  return useQuery({
    queryKey: ["recipe-feedback"],
    queryFn: async () => {
      const { data } = await supabase.from("recipe_feedback").select("*");
      return data ?? [];
    },
  });
}

export function useRecommendedProducts(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ["recommended", householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data } = await supabase
        .from("recommended_products")
        .select("*")
        .eq("household_id", householdId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useShoppingList(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ["shopping", householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data } = await supabase
        .from("shopping_list_items")
        .select("*")
        .eq("household_id", householdId!)
        .order("checked")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useExpenses(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ["expenses", householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data } = await supabase
        .from("expenses")
        .select("*")
        .eq("household_id", householdId!)
        .order("spent_on", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });
}

export function useRecipeViews() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recipe-views", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("recipe_views")
        .select("recipe_title, viewed_at")
        .eq("user_id", user!.id)
        .order("viewed_at", { ascending: false })
        .limit(40);
      return data ?? [];
    },
  });
}

export function useCurrentMealPlan(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ["mealplan", householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const start = currentWeekStart();
      const { data: plan } = await supabase
        .from("meal_plans")
        .select("*, meal_plan_entries(*, recipes(*))")
        .eq("household_id", householdId!)
        .eq("week_start", start)
        .maybeSingle();
      return plan;
    },
  });
}

export function useUpcomingMeals(householdId: string | null | undefined, fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["upcoming-meals", householdId, fromDate, toDate],
    enabled: !!householdId,
    queryFn: async () => {
      const { data: plans } = await supabase.from("meal_plans").select("id").eq("household_id", householdId!);
      const ids = (plans ?? []).map((p) => p.id);
      if (!ids.length) return [];
      const { data } = await supabase
        .from("meal_plan_entries")
        .select("*, recipes(*, recipe_ingredients(*))")
        .in("meal_plan_id", ids)
        .gte("day_date", fromDate)
        .lte("day_date", toDate)
        .order("day_date")
        .order("slot");
      return data ?? [];
    },
  });
}

export function currentWeekStart() {
  return weekStartYmd();
}

export function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const today = parseYmd(ymd());
  const d = parseYmd(dateStr);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}