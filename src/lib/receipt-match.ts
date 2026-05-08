// Pure helpers for reconciling OCR receipt items with the user's shopping list.

export type OcrItem = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  price?: number | null;
  confidence?: number | null;
  raw_text?: string | null;
};

export type ShoppingItem = {
  id: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  estimated_price?: number | null;
};

export type ReceiptRowStatus = "matched" | "uncertain" | "missing_from_list";

export type ReceiptRow = {
  key: string;
  status: ReceiptRowStatus;
  // From OCR (null when row is a list-only "missing" row)
  ocr: OcrItem | null;
  // Matched shopping list item, if any
  shopping: ShoppingItem | null;
  // Editable fields (initialised from OCR / shopping)
  name: string;
  quantity: number;
  unit: string;
  price: number | null; // null = sconosciuto, da inserire
  // User decisions
  purchased: boolean;
  pantryId: string | null;
  matchScore: number; // 0..1
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(\d+\s?(g|kg|ml|l|pz|cl))\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length >= 3);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1).fill(0).map((_, i) => i);
  const v1 = new Array(b.length + 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // token overlap
  const ta = new Set(tokens(na));
  const tb = new Set(tokens(nb));
  let overlap = 0;
  ta.forEach((t) => { if (tb.has(t)) overlap++; });
  const tokenScore = ta.size && tb.size ? overlap / Math.max(ta.size, tb.size) : 0;
  // prefix
  const prefLen = Math.min(5, na.length, nb.length);
  const prefScore = na.slice(0, prefLen) === nb.slice(0, prefLen) ? 0.6 + 0.08 * prefLen : 0;
  // levenshtein normalized
  const lev = levenshtein(na, nb);
  const levScore = 1 - lev / Math.max(na.length, nb.length);
  return Math.max(tokenScore, prefScore, levScore);
}

export function reconcileReceipt(
  ocrItems: OcrItem[],
  shopping: ShoppingItem[],
  defaultPantryId: string | null,
): ReceiptRow[] {
  const rows: ReceiptRow[] = [];
  const usedShopping = new Set<string>();

  ocrItems.forEach((oi, idx) => {
    let best: { item: ShoppingItem; score: number } | null = null;
    for (const s of shopping) {
      if (usedShopping.has(s.id)) continue;
      const score = similarity(oi.name, s.name);
      if (!best || score > best.score) best = { item: s, score };
    }
    const matched = best && best.score >= 0.7;
    const uncertain = best && best.score >= 0.4 && best.score < 0.7;
    if (matched) usedShopping.add(best!.item.id);
    const conf = oi.confidence ?? 1;
    const finalStatus: ReceiptRowStatus = matched
      ? (conf < 0.6 ? "uncertain" : "matched")
      : "uncertain";
    rows.push({
      key: `ocr-${idx}`,
      status: finalStatus,
      ocr: oi,
      shopping: matched ? best!.item : null,
      name: oi.name,
      quantity: Number(oi.quantity ?? 1),
      unit: oi.unit ?? "pz",
      price: oi.price != null ? Number(oi.price) : null,
      purchased: finalStatus === "matched",
      pantryId: defaultPantryId,
      matchScore: best?.score ?? 0,
    });
    // promote uncertain match suggestion: keep shopping ref if score >= 0.4
    if (!matched && uncertain && best) {
      rows[rows.length - 1].shopping = best.item;
    }
  });

  // Add list-only rows (in lista, non rilevati)
  shopping.forEach((s) => {
    if (usedShopping.has(s.id)) return;
    // Skip if already attached as uncertain suggestion above
    const alreadyRef = rows.some((r) => r.shopping?.id === s.id);
    if (alreadyRef) return;
    rows.push({
      key: `list-${s.id}`,
      status: "missing_from_list",
      ocr: null,
      shopping: s,
      name: s.name,
      quantity: Number(s.quantity ?? 1),
      unit: s.unit ?? "pz",
      price: s.estimated_price != null ? Number(s.estimated_price) : null,
      purchased: false,
      pantryId: defaultPantryId,
      matchScore: 0,
    });
  });

  return rows;
}