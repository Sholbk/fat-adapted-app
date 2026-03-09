const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ALLOWED_ORIGIN = process.env.SITE_URL || "https://fastfuel.training";

function respond(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return respond({}, 204);
  }

  if (req.method !== "POST") {
    return respond({ error: "POST required" }, 405);
  }

  if (!ANTHROPIC_API_KEY) {
    return respond({ error: "API key not configured" }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }

  const { weekData, currentMacros, settings } = body;
  if (!weekData || !currentMacros || !settings) {
    return respond({ error: "Missing required fields" }, 400);
  }

  const systemPrompt = `You are an AI nutrition coach for fat-adapted endurance athletes. The athlete uses a fat-adapted baseline diet (85% fat, 15% carbs) with extra training carbs only for high-intensity sessions.

Your job: analyze their last 7 days of data and recommend specific macro adjustments. Be concise and actionable.

RULES:
- Keep the fat-adapted philosophy. Never suggest high-carb diets.
- Small adjustments only (max ±200 cal, ±20g any macro).
- If everything looks good, say so — don't change things unnecessarily.
- Always explain WHY in one sentence.
- Return ONLY valid JSON, no markdown, no code fences.

Return this exact JSON structure:
{
  "calAdj": <number, calories to add/subtract from daily target>,
  "fatAdj": <number, grams to add/subtract>,
  "proteinAdj": <number, grams to add/subtract>,
  "carbAdj": <number, grams to add/subtract>,
  "reason": "<one sentence explaining the adjustment>",
  "detail": "<2-3 sentences with more context>",
  "confidence": "<low|medium|high>"
}`;

  const userPrompt = `Athlete profile:
- Weight: ${settings.weight} lbs, Height: ${settings.height} in, Age: ${settings.age}, Gender: ${settings.gender}
- Current daily targets: ${currentMacros.cal} cal, ${currentMacros.fat}g fat, ${currentMacros.protein}g protein, ${currentMacros.carbs}g carbs

Last 7 days:
${weekData.map(d => {
  const parts = [`${d.date}: mood=${d.mood || "not logged"}`];
  if (d.sleep) parts.push(`sleep=${d.sleep}`);
  if (d.sleepScore) parts.push(`sleepScore=${d.sleepScore}`);
  if (d.hrv) parts.push(`hrv=${d.hrv}ms`);
  if (d.restingHR) parts.push(`rhr=${d.restingHR}bpm`);
  if (d.load) parts.push(`load=${d.load}`);
  if (d.sessionType) parts.push(`session=${d.sessionType}`);
  parts.push(`consumed=${d.consumed.cal}cal/${d.consumed.fat}gF/${d.consumed.protein}gP/${d.consumed.carbs}gC`);
  parts.push(`target=${d.target.cal}cal/${d.target.fat}gF/${d.target.protein}gP/${d.target.carbs}gC`);
  if (d.notes) parts.push(`notes="${d.notes}"`);
  return parts.join(", ");
}).join("\n")}

Based on this data, what macro adjustments (if any) should be made?`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error:", err);
      return respond({ error: "AI service error" }, 502);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON from response
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return respond({ error: "Could not parse AI response", raw: text }, 502);
      }
    }

    return respond(parsed);
  } catch (e) {
    console.error("AI coach error:", e);
    return respond({ error: "Failed to get AI recommendation" }, 500);
  }
};
