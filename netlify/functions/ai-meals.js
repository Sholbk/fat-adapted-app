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
  if (req.method === "OPTIONS") return respond({}, 204);
  if (req.method !== "POST") return respond({ error: "POST required" }, 405);
  if (!ANTHROPIC_API_KEY) return respond({ error: "API key not configured" }, 500);

  let body;
  try {
    body = await req.json();
  } catch {
    return respond({ error: "Invalid JSON" }, 400);
  }

  const { macros, mood, dayOfWeek } = body;
  if (!macros || !macros.fat || !macros.protein || !macros.carbs || !macros.cal) {
    return respond({ error: "Missing macro targets" }, 400);
  }

  const moodText = mood && typeof mood === "string" ? mood.slice(0, 300) : "anything — surprise me";

  const systemPrompt = `You are a creative meal planner for fat-adapted endurance athletes. You generate varied, practical, real-world meals that hit specific macro targets.

RULES:
- Generate exactly 4 meals: breakfast, lunch, dinner, snack.
- Each food item must include realistic macro estimates (fat, protein, carbs in grams).
- Stay fat-adapted: high fat, moderate protein, low carb baseline.
- Be CREATIVE and VARIED. Never repeat the same meals. Use diverse cuisines, seasonal ingredients, and interesting combinations.
- Respect the athlete's mood/craving while keeping macros on target.
- Use real portion sizes (e.g., "6 oz", "1 cup", "2 tbsp").
- Each meal should have 3-5 food items.
- Keep it practical — ingredients an athlete can actually buy and prepare.

RESPOND WITH ONLY valid JSON, no markdown, no explanation. Format:
[
  {"meal":"Breakfast","foods":[{"name":"Food (portion)","f":0,"p":0,"c":0}]},
  {"meal":"Lunch","foods":[{"name":"Food (portion)","f":0,"p":0,"c":0}]},
  {"meal":"Dinner","foods":[{"name":"Food (portion)","f":0,"p":0,"c":0}]},
  {"meal":"Snack","foods":[{"name":"Food (portion)","f":0,"p":0,"c":0}]}
]`;

  const userPrompt = `Generate a fat-adapted meal plan for today (${dayOfWeek || "today"}).

Daily macro targets:
- Calories: ${macros.cal} kcal
- Fat: ${macros.fat}g
- Protein: ${macros.protein}g
- Carbs: ${macros.carbs}g

Meal distribution: Breakfast 25%, Lunch 30%, Dinner 30%, Snack 15%.

The athlete is in the mood for: ${moodText}

Generate creative, varied meals. DO NOT use the same standard keto meals every time. Think globally — Mediterranean, Asian, Latin, comfort food, etc. Match the mood while staying fat-adapted.`;

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
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("Anthropic API error:", res.status, errBody);
      return respond({ error: `AI service error (${res.status})` }, 502);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON from response (handle possible markdown wrapping)
    const jsonStr = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const meals = JSON.parse(jsonStr);

    // Validate structure
    if (!Array.isArray(meals) || meals.length !== 4) {
      return respond({ error: "Invalid meal plan format" }, 502);
    }

    for (const meal of meals) {
      if (!meal.foods || !Array.isArray(meal.foods)) {
        return respond({ error: "Invalid meal format" }, 502);
      }
      for (const food of meal.foods) {
        if (typeof food.name !== "string" || typeof food.f !== "number" || typeof food.p !== "number" || typeof food.c !== "number") {
          return respond({ error: "Invalid food format" }, 502);
        }
      }
    }

    return respond({ meals });
  } catch (e) {
    console.error("AI meals error:", e);
    return respond({ error: "Failed to generate meal plan" }, 500);
  }
};
