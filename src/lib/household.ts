import { supabase } from "@/integrations/supabase/client";

export async function ensureHousehold(userId: string): Promise<string> {
  // Ensure profile row exists (race with handle_new_user trigger)
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("current_household_id")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) throw pErr;

  if (profile?.current_household_id) return profile.current_household_id;

  if (!profile) {
    const { error: insErr } = await supabase
      .from("profiles")
      .insert({ id: userId });
    if (insErr && insErr.code !== "23505") throw insErr;
  }

  // Existing membership?
  const { data: memberships, error: mErr } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .limit(1);
  if (mErr) throw mErr;

  if (memberships && memberships.length > 0) {
    const hid = memberships[0].household_id;
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ current_household_id: hid })
      .eq("id", userId);
    if (upErr) throw upErr;
    return hid;
  }

  // Create new household
  const { data: hh, error: hhErr } = await supabase
    .from("households")
    .insert({ owner_id: userId, name: "Il mio nucleo" })
    .select("id")
    .single();
  if (hhErr || !hh) throw hhErr ?? new Error("Impossibile creare il nucleo");

  const { error: memErr } = await supabase.from("household_members").insert({
    household_id: hh.id,
    user_id: userId,
    role: "owner",
  });
  if (memErr) throw memErr;

  const { error: prefErr } = await supabase
    .from("user_preferences")
    .insert({ household_id: hh.id });
  if (prefErr && prefErr.code !== "23505") throw prefErr;

  const { error: profUpErr } = await supabase
    .from("profiles")
    .update({ current_household_id: hh.id })
    .eq("id", userId);
  if (profUpErr) throw profUpErr;

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
