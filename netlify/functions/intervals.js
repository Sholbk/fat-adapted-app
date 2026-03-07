const API_KEY = process.env.INTERVALS_API_KEY;
const ATHLETE_ID = process.env.INTERVALS_ATHLETE_ID;
const ALLOWED_ORIGIN = process.env.SITE_URL || "https://fuelflow-app.netlify.app";

const ALLOWED_ENDPOINTS = ["wellness"];

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
  if (!API_KEY || !ATHLETE_ID) return respond({ error: "Intervals.icu not configured" }, 500);

  const url = new URL(req.url);
  const endpoint = (url.searchParams.get("endpoint") || "").trim();

  // Validate endpoint against allowlist
  const baseName = endpoint.split("?")[0];
  if (!endpoint || !ALLOWED_ENDPOINTS.includes(baseName)) {
    return respond({ error: "Invalid endpoint" }, 400);
  }

  const baseUrl = `https://intervals.icu/api/v1/athlete/${ATHLETE_ID}`;
  const credentials = btoa(`API_KEY:${API_KEY}`);

  try {
    const response = await fetch(`${baseUrl}/${endpoint}`, {
      headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return respond({ error: `Intervals.icu error: ${response.status}` }, response.status);
    }

    const data = await response.json();
    return respond(data);
  } catch (error) {
    return respond({ error: error.message }, 500);
  }
};

export const config = { path: "/api/intervals" };
