import crypto from "crypto";

const CONSUMER_KEY = process.env.FATSECRET_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.FATSECRET_CONSUMER_SECRET;
const API_URL = "https://platform.fatsecret.com/rest/server.api";
const ALLOWED_ORIGIN = process.env.SITE_URL || "https://fastfuel.training";

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
  const allParams = { ...params, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`).join("&");
  const baseString = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(CONSUMER_SECRET)}&`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
  oauthParams.oauth_signature = signature;
  return oauthParams;
}

async function apiCall(apiMethod, params) {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) throw new Error("FatSecret credentials not configured");
  const allParams = { method: apiMethod, format: "json", ...params };
  const oauthParams = oauthSign("POST", API_URL, allParams);
  const body = new URLSearchParams({ ...allParams, ...oauthParams }).toString();
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`API ${r.status}: ${text}`);
  }
  const json = await r.json();
  if (json.error) throw new Error(`FatSecret: ${json.error.message || JSON.stringify(json.error)}`);
  return json;
}

function respond(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    },
  });
}

export default async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (action === "search") {
      const q = (url.searchParams.get("q") || "").trim();
      if (!q || q.length > 200) return respond([]);

      const data = await apiCall("foods.search", { search_expression: q, max_results: "8" });
      const foods = data?.foods?.food;
      if (!foods) return respond([]);

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
      return respond(results);
    }

    if (action === "get") {
      const id = url.searchParams.get("id");
      if (!id || !/^\d+$/.test(id)) return respond({ error: "invalid id" }, 400);

      const data = await apiCall("food.get.v4", { food_id: id });
      const food = data?.food;
      if (!food) return respond({ error: "not found" }, 404);

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
      return respond({ id: food.food_id, name: food.food_name, brand: food.brand_name || null, servings });
    }

    return respond({ error: "unknown action" }, 400);
  } catch {
    return respond({ error: "Internal server error" }, 500);
  }
};

export const config = { path: "/api/fatsecret" };
