const API_BASE = import.meta.env.DEV ? "http://localhost:8888/api" : "/api";

export async function apiFetch(endpoint) {
  const r = await fetch(`${API_BASE}/intervals?endpoint=${encodeURIComponent(endpoint)}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export async function searchFoods(q) {
  try {
    const r = await fetch(`${API_BASE}/fatsecret?action=search&q=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const data = await r.json();
    if (data.error) return [];
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function getFoodServings(id) {
  try {
    const r = await fetch(`${API_BASE}/fatsecret?action=get&id=${id}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function lookupBarcode(code) {
  try {
    const r = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=product_name,nutriments,serving_size`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!r.ok) return null;
    const data = await r.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const n = p.nutriments || {};
    return {
      name: p.product_name || "Unknown Product",
      fat: Math.round(n.fat_serving ?? n.fat_100g ?? 0),
      protein: Math.round(n.proteins_serving ?? n.proteins_100g ?? 0),
      carbs: Math.round(n.carbohydrates_serving ?? n.carbohydrates_100g ?? 0),
      serving: p.serving_size || "1 serving",
    };
  } catch { return null; }
}
