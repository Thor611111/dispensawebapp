import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const userId = u.user.id;
    const admin = createClient(url, service);

    // Delete owned households (cascades to members/items via app cleanup)
    const { data: owned } = await admin.from("households").select("id").eq("owner_id", userId);
    const ids = (owned ?? []).map((h: { id: string }) => h.id);
    if (ids.length) {
      await admin.from("food_items").delete().in("household_id", ids);
      await admin.from("expenses").delete().in("household_id", ids);
      await admin.from("shopping_list_items").delete().in("household_id", ids);
      await admin.from("user_preferences").delete().in("household_id", ids);
      await admin.from("household_invites").delete().in("household_id", ids);
      await admin.from("household_members").delete().in("household_id", ids);
      await admin.from("meal_plans").delete().in("household_id", ids);
      await admin.from("recipes").delete().in("household_id", ids);
      await admin.from("households").delete().in("id", ids);
    }
    await admin.from("household_members").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: corsHeaders });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});