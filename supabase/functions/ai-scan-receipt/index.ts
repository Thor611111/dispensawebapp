const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("imageBase64 mancante");
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Sei un OCR esperto di scontrini italiani della spesa. Estrai gli articoli alimentari (NO buste, sacchetti). Normalizza i nomi in italiano comune (es. 'POMOD CIL' -> 'Pomodori ciliegino'). Quantità in unità coerenti (pz, g, kg, l, ml). Prezzo è il TOTALE di quella riga in euro. Per ogni riga indica una confidence 0-1 sulla correttezza di nome+prezzo (1 = perfettamente leggibile). Includi anche raw_text con la stringa originale. Restituisci subtotal (somma articoli prima sconti), discounts (totale sconti come numero positivo) e total (totale finale pagato) quando leggibili dallo scontrino." },
          { role: "user", content: [
            { type: "text", text: "Estrai gli articoli e il totale dello scontrino in JSON." },
            { type: "image_url", image_url: { url: imageBase64 } },
          ] },
        ],
        tools: [{ type: "function", function: { name: "receipt", parameters: {
          type: "object",
          properties: {
            items: { type: "array", items: { type: "object", properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
              price: { type: "number" },
              confidence: { type: "number" },
              raw_text: { type: "string" },
            }, required: ["name", "price"] } },
            subtotal: { type: "number" },
            discounts: { type: "number" },
            total: { type: "number" },
          },
          required: ["items", "total"],
        } } }],
        tool_choice: { type: "function", function: { name: "receipt" } },
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Limite di richieste raggiunto." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "Errore AI" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    const data = await r.json();
    const args = JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");
    return new Response(JSON.stringify({
      items: args.items ?? [],
      total: args.total ?? 0,
      subtotal: args.subtotal ?? null,
      discounts: args.discounts ?? null,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});