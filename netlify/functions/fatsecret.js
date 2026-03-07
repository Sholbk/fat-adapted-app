import crypto from "crypto";

const CONSUMER_KEY = "63173fc7e51949c69953fbcf06b28e35";
const CONSUMER_SECRET = "18450834e9864d0aaebfd9add105faf1";
const API_URL = "https://platform.fatsecret.com/rest/server.api";

function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauthSign(method, url, params) {
  const oauthParams = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };

  // Combine all params and sort
  const allParams = { ...params, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`).join("&");

  // Create signature base string
  const baseString = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;

  // Sign with consumer secret + empty token secret
  const signingKey = `${percentEncode(CONSUMER_SECRET)}&`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  oauthParams.oauth_signature = signature;
  return oauthParams;
}

async function apiCall(apiMethod, params) {
  const allParams = { method: apiMethod, format: "json", ...params };
  const oauthParams = oauthSign("POST", API_URL, allParams);
  const body = new URLSearchParams({ ...allParams, ...oauthParams }).toString();

  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`API ${r.status}: ${text}`);
  }
  const json = await r.json();
  if (json.error) throw new Error(`FatSecret: ${json.error.message || JSON.stringify(json.error)}`);
  return json;
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

      const data = await apiCall("foods.search", { search_expression: q, max_results: "8" });
      const foods = data?.foods?.food;
      if (!foods) return new Response(JSON.stringify([]), { headers });

      const list = Array.isArray(foods) ? foods : [foods];
      const results = list.map((f) => {
        const desc = f.food_description || "";
        const calM = desc.match(/Calories:\s*([\d.]+)/);
        const fatM = desc.match(/Fat:\s*([\d.]+)/);
        const carbM = desc.match(/Carbs:\s*([\d.]+)/);
        const proM = desc.match(/Protein:\s*([\d.]+)/);
        const servM = desc.match(/^Per\s+(.+?)\s*-/);

        return {
          id: f.food_id,
          name: f.food_name,
          cal: calM ? parseFloat(calM[1]) : 0,
          fat: fatM ? parseFloat(fatM[1]) : 0,
          protein: proM ? parseFloat(proM[1]) : 0,
          carbs: carbM ? parseFloat(carbM[1]) : 0,
          serving: servM ? servM[1] : "1 serving",
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
