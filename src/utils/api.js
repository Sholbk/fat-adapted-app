const API_BASE = import.meta.env.DEV ? "http://localhost:8888/api" : "/api";

export async function apiFetch(endpoint, intervalsConfig) {
  const headers = {};
  if (intervalsConfig?.apiKey) headers["X-Intervals-Key"] = intervalsConfig.apiKey;
  if (intervalsConfig?.athleteId) headers["X-Intervals-Athlete"] = intervalsConfig.athleteId;
  const r = await fetch(`${API_BASE}/intervals?endpoint=${encodeURIComponent(endpoint)}`, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

export async function searchFoods(q, signal) {
  try {
    const r = await fetch(`${API_BASE}/fatsecret?action=search&q=${encodeURIComponent(q)}`, {
      signal: signal || AbortSignal.timeout(10000),
    });
    if (!r.ok) { console.warn("Food search failed:", r.status); return []; }
    const data = await r.json();
    if (data.error) { console.warn("Food search error:", data.error); return []; }
    return Array.isArray(data) ? data : [];
  } catch (e) { if (e.name !== "AbortError") console.warn("Food search error:", e); return []; }
}

export async function getFoodServings(id) {
  try {
    const r = await fetch(`${API_BASE}/fatsecret?action=get&id=${id}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) { console.warn("Food details failed:", r.status); return null; }
    return await r.json();
  } catch (e) { console.warn("Food details error:", e); return null; }
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
  } catch (e) { console.warn("Barcode lookup error:", e); return null; }
}
