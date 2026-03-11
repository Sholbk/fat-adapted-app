import { useState, useEffect } from "react";
import { MEALS, getLog, setLog } from "../utils/storage.js";
import { fmt } from "../utils/parsing.js";
import { generateMealPlan, getCachedMeals, cacheMeals } from "../utils/aiMeals.js";

const FALLBACK_PLANS = [
  { meal: "Breakfast", foods: [
    { name: "Eggs (3) cooked in butter", f: 21, p: 18, c: 2 },
    { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
    { name: "Smoked salmon (3 oz)", f: 4, p: 16, c: 0 },
    { name: "Coffee with MCT oil", f: 14, p: 0, c: 0 },
  ]},
  { meal: "Lunch", foods: [
    { name: "Grilled chicken thighs (6 oz)", f: 14, p: 42, c: 0 },
    { name: "Mixed greens with olive oil (2 tbsp)", f: 28, p: 2, c: 4 },
    { name: "Almonds (1 oz)", f: 14, p: 6, c: 3 },
    { name: "Cheese (1 oz)", f: 9, p: 7, c: 0 },
  ]},
  { meal: "Dinner", foods: [
    { name: "Grass-fed ribeye steak (8 oz)", f: 28, p: 50, c: 0 },
    { name: "Roasted broccoli with coconut oil", f: 14, p: 4, c: 8 },
    { name: "Side salad with olive oil", f: 14, p: 2, c: 3 },
    { name: "Bone broth (1 cup)", f: 1, p: 10, c: 1 },
  ]},
  { meal: "Snack", foods: [
    { name: "Macadamia nuts (1.5 oz)", f: 32, p: 3, c: 4 },
    { name: "String cheese (2)", f: 12, p: 14, c: 2 },
    { name: "Olives (10)", f: 5, p: 0, c: 2 },
  ]},
];

const MEAL_NAMES = ["breakfast", "lunch", "dinner", "snack"];
const DIST_PCTS = [
  { meal: "Breakfast", pct: 0.25 },
  { meal: "Lunch", pct: 0.30 },
  { meal: "Dinner", pct: 0.30 },
  { meal: "Snack", pct: 0.15 },
];

const MOOD_SUGGESTIONS = [
  "Something light & fresh",
  "Comfort food",
  "Mediterranean",
  "Asian-inspired",
  "Tex-Mex",
  "Quick & easy",
  "High protein",
  "Seafood",
];

const CATEGORIES = {
  "Proteins": ["egg", "salmon", "chicken", "steak", "ribeye", "turkey", "sausage", "beef", "fish", "tuna", "pork", "shrimp", "lamb", "duck", "bison", "venison", "prawn", "crab", "lobster", "sardine", "mackerel", "trout", "cod", "mahi"],
  "Dairy": ["cheese", "yogurt", "butter", "parmesan", "cream", "milk", "mozzarella", "feta", "gouda", "brie", "ricotta", "ghee", "sour cream", "crème"],
  "Produce": ["avocado", "greens", "broccoli", "salad", "vegetables", "veggies", "sweet potato", "banana", "berries", "olive", "orange", "tomato", "onion", "lettuce", "spinach", "kale", "zucchini", "mushroom", "pepper", "cucumber", "asparagus", "cauliflower", "cabbage", "radish", "celery", "lime", "lemon", "jalapeño", "cilantro", "basil", "arugula"],
  "Grains & Starches": ["oatmeal", "rice", "quinoa", "bread", "toast", "pasta", "rice cake", "tortilla", "wrap"],
  "Nuts & Seeds": ["almond", "macadamia", "nut butter", "peanut", "walnut", "pecan", "cashew", "pistachio", "hemp", "chia", "flax", "pumpkin seed", "sunflower seed", "tahini"],
  "Oils & Fats": ["olive oil", "coconut oil", "mct oil", "avocado oil", "sesame oil"],
  "Pantry": ["bone broth", "coffee", "honey", "juice", "cocoa", "coconut milk", "soy sauce", "fish sauce", "curry", "pesto"],
};

function categorizeItem(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return "Other";
}

function parseFood(foodName) {
  const cleaned = foodName.replace(/\s*(cooked in|scrambled with|scrambled|sautéed in|drizzled with|tossed in|topped with)\b.*$/i, "").trim();
  const parenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const baseName = parenMatch[1].trim();
    const inside = parenMatch[2].trim();
    const qtyUnit = inside.match(/^([\d.]+(?:\/[\d.]+)?)\s*(.*)$/);
    if (qtyUnit) {
      const num = qtyUnit[1].includes("/") ? qtyUnit[1].split("/").reduce((a, b) => a / b) : parseFloat(qtyUnit[1]);
      const unit = qtyUnit[2].replace(/\s*(cooked|raw)\s*$/i, "").trim();
      return { name: baseName, qty: num, unit: unit || "items" };
    }
    return { name: baseName, qty: 1, unit: "items" };
  }
  return { name: cleaned, qty: 1, unit: "items" };
}

function formatQty(qty, unit) {
  const q = qty % 1 === 0 ? qty.toString() : qty.toFixed(1).replace(/\.0$/, "");
  if (!unit || unit === "items") return q;
  const u = qty > 1 && !unit.endsWith("s") && !unit.endsWith("oz") && !unit.endsWith("tbsp") ? unit + "s" : unit;
  return `${q} ${u}`;
}

function buildShoppingList(plans, days) {
  const items = new Map();
  for (const meal of plans) {
    for (const food of meal.foods) {
      const parsed = parseFood(food.name);
      const key = parsed.name.toLowerCase();
      if (items.has(key)) {
        items.get(key).qty += parsed.qty * days;
      } else {
        items.set(key, { name: parsed.name, qty: parsed.qty * days, unit: parsed.unit });
      }
    }
  }
  const grouped = {};
  for (const [, item] of items) {
    const cat = categorizeItem(item.name);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  return grouped;
}

function printShoppingListPDF(grouped, weekLabel, planType) {
  const w = window.open("", "_blank");
  if (!w) return false;

  const categoryHTML = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, items]) => `
      <div class="category">
        <h2>${cat}</h2>
        ${items.map(item => `
          <div class="item">
            <span class="checkbox"></span>
            <span class="name">${item.name}</span>
            <span class="qty">${formatQty(item.qty, item.unit)}</span>
          </div>
        `).join("")}
      </div>
    `).join("");

  w.document.write(`<!DOCTYPE html>
<html>
<head>
<title>FastFuel Shopping List</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e8ad3; padding-bottom: 16px; }
  .header h1 { font-size: 24px; color: #1a1a2e; margin-bottom: 4px; }
  .header p { font-size: 13px; color: #666; }
  .category { margin-bottom: 20px; break-inside: avoid; }
  .category h2 { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1e8ad3; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; }
  .item { display: flex; align-items: center; gap: 10px; padding: 5px 0; border-bottom: 1px dotted #eee; }
  .checkbox { width: 16px; height: 16px; border: 2px solid #999; border-radius: 3px; flex-shrink: 0; }
  .name { flex: 1; font-size: 14px; }
  .qty { font-size: 13px; color: #666; font-weight: 600; white-space: nowrap; }
  .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 12px; }
  .columns { columns: 2; column-gap: 30px; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
  .print-btn { display: block; margin: 0 auto 24px; padding: 10px 32px; background: #1e8ad3; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .print-btn:hover { background: #1670b0; }
</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Download / Print PDF</button>
  <div class="header">
    <h1>Shopping List</h1>
    <p>${weekLabel} &mdash; ${planType} Plan &mdash; 7 days</p>
  </div>
  <div class="columns">
    ${categoryHTML}
  </div>
  <div class="footer">Generated by FastFuel &mdash; fastfuel.training</div>
</body>
</html>`);
  w.document.close();
  return true;
}


export default function MealIdeas({ date, macros, fuelRecTotal, session, sType, refresh, showToast, setPage }) {
  const mf = macros.fat, mp = macros.protein, mc = macros.carbs, mcal = macros.cal;
  const dist = DIST_PCTS.map(d => ({ ...d, fat: Math.round(mf * d.pct), protein: Math.round(mp * d.pct), carbs: Math.round(mc * d.pct), cal: Math.round(mcal * d.pct) }));

  const [moodInput, setMoodInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiPlans, setAiPlans] = useState(null);
  const [activeMood, setActiveMood] = useState("");

  // Load cached AI meals for this date on mount
  useEffect(() => {
    const cached = getCachedMeals(date);
    if (cached) {
      setAiPlans(cached.meals);
      setActiveMood(cached.mood || "");
    } else {
      setAiPlans(null);
      setActiveMood("");
    }
  }, [date]);

  async function handleGenerate(mood) {
    const moodText = mood || moodInput.trim() || "anything — surprise me";
    setLoading(true);
    setError("");
    setActiveMood(moodText);
    try {
      const meals = await generateMealPlan(macros, moodText, date);
      setAiPlans(meals);
    } catch (e) {
      setError(e.message || "Failed to generate meals");
    }
    setLoading(false);
  }

  function handleMoodChip(mood) {
    if (loading) return;
    setMoodInput(mood);
    handleGenerate(mood);
  }

  // Use AI plans if available, otherwise fallback
  const plans = aiPlans || FALLBACK_PLANS;
  const isAI = !!aiPlans;

  return (
    <div className="page-content">
      <h2>Meal Plan — {new Date(date + "T12:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</h2>
      <p className="page-sub">
        Non-Training Fuel — {mcal} kcal | Fat {mf}g | Protein {mp}g | Carbs {mc}g
      </p>
      <p className="page-sub" style={{ fontSize: "0.75rem", marginTop: "-0.25rem" }}>
        Training carbs are separate — see Training Fuel on the Daily Log.
      </p>

      {/* AI Mood Prompt */}
      <div className="ai-mood-card">
        <div className="ai-mood-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 2a4 4 0 014 4c0 1.5-.8 2.8-2 3.5V11h-4V9.5C8.8 8.8 8 7.5 8 6a4 4 0 014-4z"/><path d="M10 14h4"/><path d="M10 17h4"/><path d="M9 11h6v7a2 2 0 01-2 2h-2a2 2 0 01-2-2v-7z"/></svg>
          <span>What are you in the mood for?</span>
        </div>
        <div className="ai-mood-chips">
          {MOOD_SUGGESTIONS.map(m => (
            <button
              key={m}
              className={`ai-mood-chip${activeMood === m ? " active" : ""}`}
              onClick={() => handleMoodChip(m)}
              disabled={loading}
            >{m}</button>
          ))}
        </div>
        <div className="ai-mood-input-row">
          <input
            type="text"
            className="ai-mood-input"
            placeholder="Or type your own... (e.g., &quot;Italian&quot;, &quot;grilled everything&quot;, &quot;no dairy&quot;)"
            value={moodInput}
            onChange={e => setMoodInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !loading) handleGenerate(); }}
            disabled={loading}
          />
          <button
            className="ai-mood-btn"
            onClick={() => handleGenerate()}
            disabled={loading}
          >{loading ? "Generating..." : "Generate"}</button>
        </div>
        {error && <p className="ai-mood-error">{error}</p>}
        {isAI && <p className="ai-mood-label">AI-generated for: <strong>{activeMood}</strong></p>}
      </div>

      <div className="meal-plan-grid">
        {dist.map((d, i) => {
          const plan = plans[i];
          const totals = plan.foods.reduce((a, f) => ({ f: a.f + f.f, p: a.p + f.p, c: a.c + f.c }), { f: 0, p: 0, c: 0 });
          totals.cal = totals.f * 9 + totals.p * 4 + totals.c * 4;
          return (
            <div key={d.meal} className="meal-plan-card">
              <div className="mp-head">
                <h3>{plan.meal || d.meal}</h3>
                <span className="mp-target">Target: {d.cal} kcal | F:{d.fat}g P:{d.protein}g C:{d.carbs}g</span>
              </div>
              <div className="mp-foods">
                {plan.foods.map((f, j) => (
                  <div key={j} className="mp-food">
                    <span className="mp-food-name">{f.name}</span>
                    <span className="mp-food-macros">F:{f.f}g P:{f.p}g C:{f.c}g</span>
                  </div>
                ))}
              </div>
              <div className="mp-totals">
                Meal total: {totals.cal} kcal — F:{totals.f}g P:{totals.p}g C:{totals.c}g
              </div>
            </div>
          );
        })}
      </div>
      <div className="mp-actions">
        <button className="use-plan-btn" onClick={() => {
          let added = 0;
          plans.forEach((plan, i) => {
            const meal = MEAL_NAMES[i];
            const existing = getLog(date, meal);
            const entries = plan.foods.map(f => ({
              id: Date.now() + Math.random() + added,
              name: f.name,
              fat: f.f, protein: f.p, carbs: f.c
            }));
            setLog(date, meal, [...existing, ...entries]);
            added += entries.length;
          });
          refresh();
          showToast(`Added ${added} foods from meal plan`);
          setPage("log");
        }}>Use this plan for today</button>
        {isAI && (
          <button className="use-plan-btn" style={{ background: "var(--ff-blue)" }} onClick={() => handleGenerate(activeMood)}>
            Regenerate
          </button>
        )}
        <button className="shopping-list-btn" onClick={() => {
          const startDate = new Date(date + "T12:00");
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          const weekLabel = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
          const planType = isAI ? "AI Fat-Adapted" : "Fat-Adapted";
          const grouped = buildShoppingList(plans, 7);
          if (!printShoppingListPDF(grouped, weekLabel, planType)) {
            showToast("Please allow pop-ups to generate the shopping list");
          }
        }}>Weekly Shopping List (PDF)</button>
      </div>
      <div className="mp-note">
        <strong>Session note:</strong> {session.note}
      </div>
    </div>
  );
}
