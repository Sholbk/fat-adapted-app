import { MEALS, getLog, setLog } from "../utils/storage.js";

const MEAL_PLANS = {
  lowCarb: [
    { foods: [
      { name: "Eggs (3) cooked in butter", f: 21, p: 18, c: 2 },
      { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
      { name: "Smoked salmon (3 oz)", f: 4, p: 16, c: 0 },
      { name: "Coffee with MCT oil", f: 14, p: 0, c: 0 },
    ]},
    { foods: [
      { name: "Grilled chicken thighs (6 oz)", f: 14, p: 42, c: 0 },
      { name: "Mixed greens with olive oil (2 tbsp)", f: 28, p: 2, c: 4 },
      { name: "Almonds (1 oz)", f: 14, p: 6, c: 3 },
      { name: "Cheese (1 oz)", f: 9, p: 7, c: 0 },
    ]},
    { foods: [
      { name: "Grass-fed ribeye steak (8 oz)", f: 28, p: 50, c: 0 },
      { name: "Roasted broccoli with coconut oil", f: 14, p: 4, c: 8 },
      { name: "Side salad with olive oil", f: 14, p: 2, c: 3 },
      { name: "Bone broth (1 cup)", f: 1, p: 10, c: 1 },
    ]},
    { foods: [
      { name: "Macadamia nuts (1.5 oz)", f: 32, p: 3, c: 4 },
      { name: "String cheese (2)", f: 12, p: 14, c: 2 },
      { name: "Olives (10)", f: 5, p: 0, c: 2 },
    ]},
  ],
  midCarb: [
    { foods: [
      { name: "Eggs (3) scrambled with veggies", f: 18, p: 20, c: 4 },
      { name: "Oatmeal (1/2 cup) with berries", f: 3, p: 5, c: 20 },
      { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
      { name: "Turkey sausage (2 links)", f: 8, p: 14, c: 2 },
    ]},
    { foods: [
      { name: "Grilled salmon (6 oz)", f: 18, p: 40, c: 0 },
      { name: "Sweet potato (1 medium)", f: 0, p: 4, c: 26 },
      { name: "Mixed greens with olive oil", f: 14, p: 2, c: 4 },
      { name: "Quinoa (1/2 cup cooked)", f: 2, p: 4, c: 20 },
    ]},
    { foods: [
      { name: "Chicken breast (6 oz)", f: 4, p: 48, c: 0 },
      { name: "Brown rice (3/4 cup cooked)", f: 1, p: 4, c: 34 },
      { name: "Roasted vegetables with olive oil", f: 14, p: 3, c: 10 },
      { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
    ]},
    { foods: [
      { name: "Greek yogurt (1 cup)", f: 5, p: 20, c: 8 },
      { name: "Almonds (1 oz)", f: 14, p: 6, c: 3 },
      { name: "Banana (1/2)", f: 0, p: 1, c: 14 },
    ]},
  ],
  highCarb: [
    { foods: [
      { name: "Oatmeal (1 cup) with banana & honey", f: 4, p: 8, c: 52 },
      { name: "Eggs (3) scrambled", f: 15, p: 18, c: 2 },
      { name: "Toast with nut butter (1 tbsp)", f: 12, p: 7, c: 15 },
      { name: "Orange juice (8 oz)", f: 0, p: 2, c: 26 },
    ]},
    { foods: [
      { name: "Rice bowl with salmon (6 oz)", f: 18, p: 40, c: 45 },
      { name: "Sweet potato (1 large)", f: 0, p: 4, c: 38 },
      { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
      { name: "Mixed greens with olive oil", f: 14, p: 2, c: 4 },
    ]},
    { foods: [
      { name: "Pasta (2 cups) with chicken (6 oz)", f: 8, p: 52, c: 60 },
      { name: "Olive oil & parmesan", f: 18, p: 4, c: 2 },
      { name: "Roasted vegetables", f: 5, p: 3, c: 12 },
      { name: "Bread roll with butter", f: 8, p: 4, c: 22 },
    ]},
    { foods: [
      { name: "Rice cakes (3) with nut butter", f: 12, p: 7, c: 28 },
      { name: "Banana", f: 0, p: 1, c: 27 },
      { name: "Greek yogurt (1/2 cup)", f: 3, p: 12, c: 4 },
    ]},
  ],
};

const MEAL_NAMES = ["breakfast", "lunch", "dinner", "snack"];
const DIST_PCTS = [
  { meal: "Breakfast", pct: 0.25 },
  { meal: "Lunch", pct: 0.30 },
  { meal: "Dinner", pct: 0.30 },
  { meal: "Snack", pct: 0.15 },
];

export default function MealIdeas({ date, macros, session, sType, refresh, showToast, setPage }) {
  const mf = macros.fat, mp = macros.protein, mc = macros.carbs, mcal = macros.cal;
  const lowCarb = ["rest", "endurance", "lowerTempo"].includes(sType);
  const midCarb = sType === "upperTempo";
  const dist = DIST_PCTS.map(d => ({ ...d, fat: Math.round(mf * d.pct), protein: Math.round(mp * d.pct), carbs: Math.round(mc * d.pct), cal: Math.round(mcal * d.pct) }));
  const plans = lowCarb ? MEAL_PLANS.lowCarb : midCarb ? MEAL_PLANS.midCarb : MEAL_PLANS.highCarb;

  return (
    <div className="page-content">
      <h2>Meal Plan — {new Date(date + "T12:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</h2>
      <p className="page-sub">
        Based on your <strong style={{ color: session.color }}>{session.label}</strong> session — {mcal} kcal | Fat {mf}g | Protein {mp}g | Carbs {mc}g
      </p>
      <div className="meal-plan-grid">
        {dist.map((d, i) => {
          const plan = plans[i];
          const totals = plan.foods.reduce((a, f) => ({ f: a.f + f.f, p: a.p + f.p, c: a.c + f.c }), { f: 0, p: 0, c: 0 });
          totals.cal = totals.f * 9 + totals.p * 4 + totals.c * 4;
          return (
            <div key={d.meal} className="meal-plan-card">
              <div className="mp-head">
                <h3>{d.meal}</h3>
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
      <div className="mp-note">
        <strong>Session note:</strong> {session.note}
      </div>
    </div>
  );
}
