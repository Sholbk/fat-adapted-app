const ALLOWED_ORIGIN = process.env.SITE_URL || "https://fastfuel.training";
const ALLOWED_HOSTS = ["app.athletica.ai"];

export default async (req) => {
  const url = new URL(req.url);
  const icsUrl = url.searchParams.get("url");

  if (!icsUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate URL against allowed hosts
  try {
    const parsed = new URL(icsUrl);
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return new Response(JSON.stringify({ error: "Host not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(icsUrl, {
      headers: { Accept: "text/calendar" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return new Response(`ICS fetch error: ${response.status}`, { status: response.status });
    }

    const text = await response.text();
    return new Response(text, {
      headers: {
        "Content-Type": "text/calendar",
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Netlify-CDN-Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
};

export const config = { path: "/api/ics-proxy" };
