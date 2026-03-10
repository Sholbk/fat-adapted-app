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

  const { weekData, currentMacros, settings, messages } = body;
  if (!settings) {
    return respond({ error: "Missing required fields" }, 400);
  }

  const systemPrompt = `You are an AI nutrition coach for fat-adapted endurance athletes. The athlete uses a fat-adapted baseline diet (~85% fat, ~15% carbs) with extra training carbs only for high-intensity sessions.

You are having a conversation with the athlete. Be warm, concise, and actionable.

CONVERSATION RULES:
- Greet the athlete and reference their data (HRV, sleep, today's session, recent patterns).
- Ask ONE follow-up question at a time about how they feel, energy levels, carb tolerance, GI comfort, or recovery.
- Listen to their answers and adapt your advice accordingly.
- Keep messages to 1-3 sentences. Be conversational, not clinical.
- Keep the fat-adapted philosophy. Never suggest high-carb diets.

WHEN READY TO SUGGEST AN ADJUSTMENT:
- Include a JSON block in your message wrapped in <adjustment> tags.
- Small adjustments only (max +/-200 cal, +/-20g any macro).
- Format: <adjustment>{"calAdj":0,"fatAdj":0,"proteinAdj":0,"carbAdj":0,"confidence":"medium"}</adjustment>
- You can include an adjustment alongside conversational text.
- Only suggest adjustments when you have enough context from the conversation.
- If everything looks good, say so — don't change things unnecessarily.`;

  // Build the context message with athlete data
  let contextBlock = "";
  if (weekData && currentMacros) {
    contextBlock = `Athlete profile:
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
}).join("\n")}`;
  }

  // Build multi-turn messages array
  const apiMessages = [];

  const VALID_ROLES = new Set(["user", "assistant"]);
  const MAX_MESSAGE_LENGTH = 2000;
  const MAX_MESSAGES = 50;

  if (messages && messages.length > 0) {
    // Conversation continuation — context was in the first message
    const trimmed = messages.slice(-MAX_MESSAGES);
    for (const m of trimmed) {
      if (!m.role || !VALID_ROLES.has(m.role)) {
        return respond({ error: "Invalid message role" }, 400);
      }
      if (!m.content || typeof m.content !== "string") {
        return respond({ error: "Invalid message content" }, 400);
      }
      apiMessages.push({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) });
    }
  } else {
    // First message — include full data context
    apiMessages.push({
      role: "user",
      content: contextBlock + "\n\nGreet me and ask how I'm feeling today. Reference my data.",
    });
  }

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
        max_tokens: 1024,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Anthropic API error: Status", res.status);
      return respond({ error: "AI service error" }, 502);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    // Check if the response contains an adjustment
    const adjMatch = text.match(/<adjustment>([\s\S]*?)<\/adjustment>/);
    let adjustment = null;
    let message = text.replace(/<adjustment>[\s\S]*?<\/adjustment>/, "").trim();

    if (adjMatch) {
      try {
        adjustment = JSON.parse(adjMatch[1]);
      } catch {
        // Ignore parse errors for adjustment block
      }
    }

    return respond({ message, adjustment });
  } catch (e) {
    console.error("AI coach error:", e);
    return respond({ error: "Failed to get AI recommendation" }, 500);
  }
};
