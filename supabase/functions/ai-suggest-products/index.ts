const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { foodItems = [], preferences, expenses = [] } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const ctx = `Dispensa: ${foodItems.map((f: any) => `${f.name}(${f.quantity}${f.unit})`).join(", ") || "vuota"}\nDiete: ${(preferences?.diets ?? []).join(", ") || "nessuna"}\nAllergie: ${(preferences?.allergies ?? []).join(", ") || "nessuna"}\nBudget settimanale: ${preferences?.weekly_budget ?? "—"} EUR\nSpese recenti totali: ${expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0).toFixed(2)} EUR`;
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Sei un assistente spesa intelligente. Suggerisci 6 prodotti utili che mancano in dispensa, considerando equilibrio nutrizionale, diete e budget." },
          { role: "user", content: ctx },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_products",
            parameters: {
              type: "object",
              properties: {
                products: {
                  type: "array",
                  items: { type: "object", properties: { name: { type: "string" }, category: { type: "string" }, reason: { type: "string" } }, required: ["name", "reason"] },
                },
              },
              required: ["products"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_products" } },
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Limite raggiunto." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "Errore AI" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    const data = await r.json();
    const args = JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{\"products\":[]}");
    return new Response(JSON.stringify(args), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});