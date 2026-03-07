const CLIENT_ID = "63173fc7e51949c69953fbcf06b28e35";
const CLIENT_SECRET = "ba50e0adf0ce4df99f66d4697e608cf7";
const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const API_URL = "https://platform.fatsecret.com/rest/server.api";

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=basic",
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Token error: ${r.status} ${text}`);
  }
  const d = await r.json();
  cachedToken = d.access_token;
  tokenExpiry = Date.now() + (d.expires_in - 60) * 1000;
  return cachedToken;
}

async function apiCall(method, params) {
  const token = await getToken();
  const qs = new URLSearchParams({ method, format: "json", ...params });
  const r = await fetch(`${API_URL}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`API error: ${r.status} ${text}`);
  }
  const json = await r.json();
  if (json.error) throw new Error(`FatSecret: ${json.error.message || JSON.stringify(json.error)}`);
  return json;
}

function parseServing(servings) {
  // FatSecret returns servings.serving as an object (single) or array (multiple)
  const list = Array.isArray(servings?.serving) ? servings.serving : servings?.serving ? [servings.serving] : [];
  // Prefer "1 tsp", "1 tbsp", "1 oz", "100g" style servings; fallback to first
  const preferred = list.find(s => /^1\s/.test(s.serving_description) && /\b(g|oz|cup|tbsp|tsp)\b/i.test(s.serving_description));
  return preferred || list[0] || null;
}

export default async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    if (action === "search") {
      const q = url.searchParams.get("q");
      if (!q) return new Response(JSON.stringify([]), { headers });

      const data = await apiCall("foods.search", { search_expression: q, max_results: 8 });
      const foods = data?.foods?.food;
      if (!foods) return new Response(JSON.stringify([]), { headers });

      const list = Array.isArray(foods) ? foods : [foods];
      const results = list.map((f) => {
        // Get all servings for this food
        const servings = f.food_description || "";
        // Parse the description line: "Per 100g - Calories: 876kcal | Fat: 99.52g | Carbs: 0.00g | Protein: 0.28g"
        const calM = servings.match(/Calories:\s*([\d.]+)/);
        const fatM = servings.match(/Fat:\s*([\d.]+)/);
        const carbM = servings.match(/Carbs:\s*([\d.]+)/);
        const proM = servings.match(/Protein:\s*([\d.]+)/);
        // Parse serving size from "Per XXX -" prefix
        const servM = servings.match(/^Per\s+(.+?)\s*-/);
        const servingDesc = servM ? servM[1] : "1 serving";

        return {
          id: f.food_id,
          name: f.food_name,
          cal: calM ? parseFloat(calM[1]) : 0,
          fat: fatM ? parseFloat(fatM[1]) : 0,
          protein: proM ? parseFloat(proM[1]) : 0,
          carbs: carbM ? parseFloat(carbM[1]) : 0,
          serving: servingDesc,
          brand: f.brand_name || null,
        };
      });

      return new Response(JSON.stringify(results), { headers });
    }

    if (action === "get") {
      const id = url.searchParams.get("id");
      if (!id) return new Response(JSON.stringify({ error: "missing id" }), { status: 400, headers });

      const data = await apiCall("food.get.v4", { food_id: id });
      const food = data?.food;
      if (!food) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers });

      const servingsRaw = food.servings;
      const servList = Array.isArray(servingsRaw?.serving) ? servingsRaw.serving : servingsRaw?.serving ? [servingsRaw.serving] : [];

      const servings = servList.map((s) => ({
        id: s.serving_id,
        desc: s.serving_description,
        amount: parseFloat(s.metric_serving_amount) || 0,
        unit: s.metric_serving_unit || "g",
        cal: parseFloat(s.calories) || 0,
        fat: parseFloat(s.fat) || 0,
        protein: parseFloat(s.protein) || 0,
        carbs: parseFloat(s.carbohydrate) || 0,
      }));

      return new Response(JSON.stringify({
        id: food.food_id,
        name: food.food_name,
        brand: food.brand_name || null,
        servings,
      }), { headers });
    }

    if (action === "barcode") {
      const code = url.searchParams.get("code");
      if (!code) return new Response(JSON.stringify({ error: "missing code" }), { status: 400, headers });

      const data = await apiCall("food.find_id_for_barcode", { barcode: code });
      const foodId = data?.food_id?.value;
      if (!foodId) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers });

      // Fetch full food details
      const detail = await apiCall("food.get.v4", { food_id: foodId });
      const food = detail?.food;
      if (!food) return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers });

      const servingsRaw = food.servings;
      const servList = Array.isArray(servingsRaw?.serving) ? servingsRaw.serving : servingsRaw?.serving ? [servingsRaw.serving] : [];
      const s = servList[0];

      return new Response(JSON.stringify({
        name: food.food_name,
        fat: s ? parseFloat(s.fat) || 0 : 0,
        protein: s ? parseFloat(s.protein) || 0 : 0,
        carbs: s ? parseFloat(s.carbohydrate) || 0 : 0,
        serving: s ? s.serving_description : "1 serving",
      }), { headers });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};

export const config = {
  path: "/api/fatsecret",
};
