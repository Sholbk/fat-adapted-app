const CACHE_KEY = "ff-ai-meals";

export function getCachedMeals(date) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (cached && cached.date === date) return cached;
  } catch { /* ignore */ }
  return null;
}

export function cacheMeals(date, meals, mood) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ date, meals, mood, ts: Date.now() }));
}

export async function generateMealPlan(macros, mood, date) {
  const dayOfWeek = new Date(date + "T12:00").toLocaleDateString("en-US", { weekday: "long" });
  const url = "/.netlify/functions/ai-meals";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ macros, mood, dayOfWeek }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate meals");
  }

  const data = await res.json();
  cacheMeals(date, data.meals, mood);
  return data.meals;
}
