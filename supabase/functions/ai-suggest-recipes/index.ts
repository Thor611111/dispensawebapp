const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { foodItems, preferences, count = 5, likes = [], dislikes = [], filters = {} } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const filterLines: string[] = [];
    if (filters.maxMinutes) filterLines.push(`- Tempo max: ${filters.maxMinutes} minuti`);
    if (filters.maxCost) filterLines.push(`- Costo max per ricetta: ${filters.maxCost} EUR`);
    if (filters.difficulty) filterLines.push(`- Difficoltà richiesta: ${filters.difficulty}`);
    const ctx = `Dispensa attuale (con scadenze):\n${(foodItems ?? [])
      .map((f: any) => `- ${f.name} (${f.quantity}${f.unit}${f.expires_on ? `, scade ${f.expires_on}` : ""})`)
      .join("\n") || "(vuota)"}\n\nPreferenze:\n- Persone: ${preferences?.household_size ?? 2}\n- Diete: ${(preferences?.diets ?? []).join(", ") || "nessuna"}\n- Allergie: ${(preferences?.allergies ?? []).join(", ") || "nessuna"}\n- Obiettivi: ${(preferences?.goals ?? []).join(", ") || "—"}\n- Budget settimanale: ${preferences?.weekly_budget ?? "non impostato"} EUR\n- Ricette gradite (proponi simili): ${likes.join(", ") || "—"}\n- Ricette NON gradite (EVITA assolutamente piatti simili): ${dislikes.join(", ") || "—"}${filterLines.length ? `\n\nFiltri OBBLIGATORI:\n${filterLines.join("\n")}` : ""}`;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Sei uno chef italiano che propone ricette pratiche. Privilegia ingredienti già disponibili e quelli in scadenza. Rispetta diete/allergie. Tempo, costo e difficoltà realistici." },
        { role: "user", content: `Proponi ${count} ricette diverse. Spiega in 'reason' perché la suggerisci (es: usa X che scade, basso costo, veloce).\n\n${ctx}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "suggest_recipes",
            description: "Restituisce ricette suggerite",
            parameters: {
              type: "object",
              properties: {
                recipes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      reason: { type: "string" },
                      prep_minutes: { type: "integer" },
                      difficulty: { type: "string", enum: ["facile", "media", "difficile"] },
                      estimated_cost: { type: "number" },
                      servings: { type: "integer" },
                      ingredients: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            quantity: { type: "number" },
                            unit: { type: "string" },
                          },
                          required: ["name"],
                        },
                      },
                      instructions: { type: "string" },
                    },
                    required: ["title", "reason", "prep_minutes", "estimated_cost", "ingredients", "instructions"],
                  },
                },
              },
              required: ["recipes"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "suggest_recipes" } },
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "Limite di richieste raggiunto." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!r.ok) {
      const t = await r.text();
      console.error(t);
      return new Response(JSON.stringify({ error: "Errore AI" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : { recipes: [] };
    return new Response(JSON.stringify(args), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});