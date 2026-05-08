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
    const { url } = await req.json();
    if (!url) throw new Error("url mancante");
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const pageRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 DispensaBot" } });
    if (!pageRes.ok) throw new Error(`Impossibile caricare la pagina (${pageRes.status})`);
    let html = await pageRes.text();
    // strip scripts/styles + tags to keep payload small
    html = html.replace(/<script[\s\S]*?<\/script>/gi, " ")
               .replace(/<style[\s\S]*?<\/style>/gi, " ")
               .replace(/<[^>]+>/g, " ")
               .replace(/\s+/g, " ")
               .slice(0, 18000);

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Estrai una ricetta da una pagina web. Restituisci titolo, descrizione breve, ingredienti strutturati, istruzioni in passi numerati, tempo di preparazione totale in minuti, costo stimato in euro, difficoltà (facile/media/difficile), porzioni. Tutto in italiano." },
          { role: "user", content: `URL: ${url}\n\nContenuto:\n${html}` },
        ],
        tools: [{ type: "function", function: { name: "recipe", parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            prep_minutes: { type: "integer" },
            estimated_cost: { type: "number" },
            difficulty: { type: "string" },
            servings: { type: "integer" },
            instructions: { type: "string" },
            ingredients: { type: "array", items: { type: "object", properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
            }, required: ["name"] } },
          },
          required: ["title", "ingredients", "instructions"],
        } } }],
        tool_choice: { type: "function", function: { name: "recipe" } },
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Limite richieste" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti" }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "Errore AI" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    const data = await r.json();
    const args = JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    return new Response(JSON.stringify(args), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});