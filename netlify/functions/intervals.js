export default async (req) => {
  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");
  const athleteId = url.searchParams.get("athleteId");
  const apiKey = url.searchParams.get("apiKey");

  if (!endpoint || !athleteId || !apiKey) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseUrl = `https://intervals.icu/api/v1/athlete/${athleteId}`;
  const credentials = btoa(`API_KEY:${apiKey}`);

  try {
    const response = await fetch(`${baseUrl}/${endpoint}`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Intervals.icu API error: ${response.status}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/api/intervals",
};
