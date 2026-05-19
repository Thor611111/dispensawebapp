import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { randomBytes } from "crypto";

function newToken() {
  return randomBytes(24).toString("base64url");
}

async function getOrCreate(ctx: any) {
  const { supabase, userId } = ctx;
  const { data } = await supabase.from("calendar_tokens").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data;
  const { data: prof } = await supabase.from("profiles").select("current_household_id").eq("id", userId).maybeSingle();
  if (!prof?.current_household_id) throw new Error("Nessun nucleo familiare attivo");
  const row = {
    user_id: userId,
    household_id: prof.current_household_id,
    token: newToken(),
  };
  const { data: inserted, error } = await supabase.from("calendar_tokens").insert(row).select("*").single();
  if (error) throw new Error(error.message);
  return inserted;
}

export const getCalendarToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const row = await getOrCreate(context as any);
    return row;
  });

export const regenerateCalendarToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await getOrCreate(context as any);
    const { data, error } = await supabase
      .from("calendar_tokens")
      .update({ token: newToken() })
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateCalendarPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    default_meal_minutes?: number;
    breakfast_time?: string;
    lunch_time?: string;
    dinner_time?: string;
    snack_time?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await getOrCreate(context as any);
    const patch: Record<string, unknown> = {};
    for (const k of ["default_meal_minutes","breakfast_time","lunch_time","dinner_time","snack_time"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    const { data: row, error } = await supabase
      .from("calendar_tokens").update(patch).eq("user_id", userId).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });