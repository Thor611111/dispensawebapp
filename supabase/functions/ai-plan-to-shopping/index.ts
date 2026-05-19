import { requireUser } from "../_shared/auth.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const authCheck = await requireUser(req);
  if (authCheck instanceof Response) return authCheck;
  try {
    const { meals = [], pantry = [], preferences } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const mealList = meals.map((m: any) => {
      const ing = (m.ingredients ?? [])
        .map((i: any) => `${i.quantity ?? ""} ${i.unit ?? ""} ${i.name}`.trim())
        .join(", ");
      const srv = m.servings ? ` · ${m.servings} porz.` : "";
      const notes = m.notes ? ` (${m.notes})` : "";
      return `- ${m.title}${srv}${notes}${ing ? `\n   ingredienti: ${ing}` : ""}`;
    }).join("\n") || "(nessun pasto)";
    const pantryList = pantry.map((p: any) => `${p.name} ${p.quantity ?? ""}${p.unit ?? ""}`).join(", ") || "(vuota)";
    const prefStr = `Diete: ${(preferences?.diets ?? []).join(", ") || "—"} · Allergie: ${(preferences?.allergies ?? []).join(", ") || "—"} · Persone: ${preferences?.household_size ?? 2}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Sei un assistente spesa. Dato un piano pasti e gli alimenti già in dispensa, restituisci SOLO gli ingredienti MANCANTI o INSUFFICIENTI da comprare per cucinare i pasti. Considera quantità realistiche per le persone indicate. Non ripetere ciò che è già in dispensa in quantità sufficiente. Raggruppa e normalizza i nomi (es. 'pomodori' invece di duplicati)." },
          { role: "user", content: `Pasti pianificati:\n${mealList}\n\nDispensa attuale: ${pantryList}\n\n${prefStr}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "missing_items",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      quantity: { type: "number" },
                      unit: { type: "string" },
                      category: { type: "string" },
                    },
                    required: ["name", "quantity", "unit"],
                  },
                },
              },
              required: ["items"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "missing_items" } },
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Limite raggiunto." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "Errore AI" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    const data = await r.json();
    const args = JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{\"items\":[]}");
    return new Response(JSON.stringify(args), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});