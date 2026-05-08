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
    const { name, quantity, unit } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Sei un nutrizionista. Stima le kcal totali per la quantità indicata di alimento." },
          { role: "user", content: `Stima kcal per: ${quantity} ${unit} di ${name}. Restituisci solo il numero (intero).` },
        ],
        tools: [{ type: "function", function: { name: "kcal", parameters: { type: "object", properties: { kcal: { type: "number" } }, required: ["kcal"] } } }],
        tool_choice: { type: "function", function: { name: "kcal" } },
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Limite di richieste raggiunto." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "Errore AI" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    const data = await r.json();
    const args = JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    return new Response(JSON.stringify({ kcal: args.kcal ?? null }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});