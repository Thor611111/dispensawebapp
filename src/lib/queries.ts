import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useHouseholdId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["householdId", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("current_household_id")
        .eq("id", user!.id)
        .maybeSingle();
      return data?.current_household_id ?? null;
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

export function currentWeekStart() {
  const d = new Date();
  const day = d.getDay(); // 0 sun
  const diff = (day + 6) % 7; // monday-based
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}