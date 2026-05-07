import "https://deno.land/x/xhr@0.1.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { text, imageBase64 } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const userContent: any[] = [];
    if (text) userContent.push({ type: "text", text: `Estrai alimenti dal seguente testo italiano (scontrino o lista): ${text}` });
    if (imageBase64) {
      userContent.push({ type: "text", text: "Estrai l'elenco degli alimenti dall'immagine (scontrino o frigo). Restituisci nomi puliti in italiano, quantità numerica con unità (pz, g, kg, l, ml), prezzo se visibile." });
      userContent.push({ type: "image_url", image_url: { url: imageBase64 } });
    }
    if (!userContent.length) {
      return new Response(JSON.stringify({ error: "Fornisci testo o immagine" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Sei un assistente che estrae alimenti in modo strutturato. Categorie consigliate: Frutta e Verdura, Latticini, Carne e Pesce, Pasta e Cereali, Dispensa, Surgelati, Bevande, Altro. Posizione consigliata (location): fridge, freezer, pantry, other." },
        { role: "user", content: userContent },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_foods",
            description: "Restituisce alimenti estratti.",
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
                      location: { type: "string", enum: ["fridge", "freezer", "pantry", "other"] },
                      price: { type: "number" },
                      shelf_life_days: { type: "integer", description: "Giorni stimati prima della scadenza dall'oggi" },
                      kcal_per_unit: { type: "number", description: "Calorie stimate per unità (es. per pz, per 100g, per L)" },
                    },
                    required: ["name", "quantity", "unit", "location"],
                  },
                },
              },
              required: ["items"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_foods" } },
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "Limite di richieste raggiunto. Riprova tra qualche istante." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti. Aggiungi crediti dal workspace." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!r.ok) {
      const t = await r.text();
      console.error("AI error", r.status, t);
      return new Response(JSON.stringify({ error: "Errore AI" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const data = await r.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : { items: [] };
    return new Response(JSON.stringify(args), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});