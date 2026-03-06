export default async (req) => {
  const url = new URL(req.url);
  const icsUrl = url.searchParams.get("url");

  if (!icsUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(icsUrl, {
      headers: { Accept: "text/calendar" },
    });

    if (!response.ok) {
      return new Response(`ICS fetch error: ${response.status}`, {
        status: response.status,
      });
    }

    const text = await response.text();
    return new Response(text, {
      headers: {
        "Content-Type": "text/calendar",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
};

export const config = {
  path: "/api/ics-proxy",
};
