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
    const body = await req.json();
    const rawNames = body.names;
    if (!Array.isArray(rawNames) || !rawNames.length) {
      return new Response(JSON.stringify({ items: [] }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    // Accept either ["name", ...] or [{name, unit}, ...]
    const items = rawNames.map((n: any) => typeof n === "string" ? { name: n, unit: "pz" } : { name: n.name, unit: n.unit ?? "pz" });
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Sei un assistente che smista alimenti italiani. Per ogni alimento decidi: location (fridge=frigo per latticini/carne/affettati/verdure fresche/uova; freezer=surgelati/gelato; pantry=secchi/scatolame/pasta/biscotti/olio; other=detersivi o non-cibo), una category breve (Frutta e Verdura, Latticini, Carne e Pesce, Pasta e Cereali, Dispensa, Surgelati, Bevande, Altro), shelf_life_days realistico, e kcal_per_unit STIMATE PER 1 UNIT\u00c0 dell'unit\u00e0 fornita (es. unit='g' \u2192 kcal in 1 grammo come 3.5 per pasta secca; unit='ml' \u2192 kcal in 1 ml come 0.46 per latte; unit='pz' \u2192 kcal di 1 pezzo come 70 per una mela; unit='kg' \u2192 kcal in 1 kg; unit='l' \u2192 kcal in 1 litro). Restituisci kcal_per_unit con i decimali necessari." },
          { role: "user", content: `Classifica questi alimenti (rispetta l'unit\u00e0 indicata per kcal_per_unit): ${JSON.stringify(items)}` },
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