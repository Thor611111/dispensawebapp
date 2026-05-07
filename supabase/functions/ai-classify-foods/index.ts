const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { names } = await req.json();
    if (!Array.isArray(names) || !names.length) {
      return new Response(JSON.stringify({ items: [] }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Sei un assistente che smista alimenti italiani. Per ogni nome decidi: location (fridge=frigo per latticini/carne/affettati/verdure fresche/uova; freezer=surgelati/gelato; pantry=secchi/scatolame/pasta/biscotti/olio; other=detersivi o non-cibo), una category breve (Frutta e Verdura, Latticini, Carne e Pesce, Pasta e Cereali, Dispensa, Surgelati, Bevande, Altro), shelf_life_days realistico dall'oggi, kcal_per_unit stimate (per pz/100g/L a seconda)." },
          { role: "user", content: `Classifica questi alimenti: ${JSON.stringify(names)}` },
        ],
        tools: [{ type: "function", function: { name: "classify", parameters: {
          type: "object",
          properties: {
            items: { type: "array", items: { type: "object", properties: {
              name: { type: "string" },
              location: { type: "string", enum: ["fridge", "freezer", "pantry", "other"] },
              category: { type: "string" },
              shelf_life_days: { type: "integer" },
              kcal_per_unit: { type: "number" },
            }, required: ["name", "location"] } },
          },
          required: ["items"],
        } } }],
        tool_choice: { type: "function", function: { name: "classify" } },
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Limite richieste" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti" }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "Errore AI" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    const data = await r.json();
    const args = JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    return new Response(JSON.stringify({ items: args.items ?? [] }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});