import { supabase } from "@/integrations/supabase/client";

export async function ensureHousehold(userId: string): Promise<string> {
  // Check current_household_id on profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_household_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.current_household_id) return profile.current_household_id;

  // Check if user is already a member of any household
  const { data: memberships } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .limit(1);

  if (memberships && memberships.length > 0) {
    const hid = memberships[0].household_id;
    await supabase.from("profiles").update({ current_household_id: hid }).eq("id", userId);
    return hid;
  }

  // Create a new household
  const { data: hh, error } = await supabase
    .from("households")
    .insert({ owner_id: userId, name: "Il mio nucleo" })
    .select("id")
    .single();
  if (error || !hh) throw error ?? new Error("Impossibile creare il nucleo");

  await supabase.from("household_members").insert({
    household_id: hh.id,
    user_id: userId,
    role: "owner",
  });

  await supabase.from("user_preferences").insert({ household_id: hh.id });

  await supabase.from("profiles").update({ current_household_id: hh.id }).eq("id", userId);

  return hh.id;
}

export async function getCurrentHouseholdId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("current_household_id")
    .eq("id", userId)
    .maybeSingle();
  return data?.current_household_id ?? null;
}