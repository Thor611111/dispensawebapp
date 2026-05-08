export type StatusIngredient = { name: string };
export type StatusFoodItem = { name: string; expires_on: string | null };

export function getRecipeStatus(
  ingredients: StatusIngredient[] | null | undefined,
  foodItems: StatusFoodItem[],
  warningDays: number,
): { missing: string[]; expiringUsed: string[]; allInPantry: boolean; hasIngredients: boolean } {
  const ings = (ingredients ?? []).filter((i) => i?.name);
  if (!ings.length) {
    return { missing: [], expiringUsed: [], allInPantry: false, hasIngredients: false };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = today.getTime() + warningDays * 86400000;
  const norm = (s: string) => s.toLowerCase().trim();
  const pantryByName = new Map<string, StatusFoodItem>();
  for (const f of foodItems) pantryByName.set(norm(f.name), f);

  const missing: string[] = [];
  const expiringUsed: string[] = [];
  for (const ing of ings) {
    const key = norm(ing.name);
    let match = pantryByName.get(key);
    if (!match) {
      // fuzzy: contains
      for (const [k, v] of pantryByName) {
        if (k.includes(key) || key.includes(k)) { match = v; break; }
      }
    }
    if (!match) {
      missing.push(ing.name);
      continue;
    }
    if (match.expires_on) {
      const t = new Date(match.expires_on).getTime();
      if (t <= limit) expiringUsed.push(ing.name);
    }
  }
  return { missing, expiringUsed, allInPantry: missing.length === 0, hasIngredients: true };
}