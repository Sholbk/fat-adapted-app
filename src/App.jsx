import { useState, useEffect } from "react";
import "./App.css";

import { fmt, today, parseICS } from "./utils/parsing.js";
import { classifyWorkout, getSessionTypeFromWorkouts } from "./utils/classification.js";
import { SESSION_CONFIG, calcMacros, calcFuelRec, sumFuelRec } from "./utils/macros.js";
import { MEALS, getSettings, saveSettings, DEFAULT_SETTINGS, getLog, setLog, getTLog, setTLog, sum } from "./utils/storage.js";
import { apiFetch } from "./utils/api.js";

import FoodInput from "./components/FoodInput.jsx";
import Entries from "./components/Entries.jsx";
import Ring from "./components/Ring.jsx";
import MacroRow from "./components/MacroRow.jsx";

const ATHLETICA_ICS_RAW = "https://app.athletica.ai/4935a810a4/athletica.ics";
const ATHLETICA_ICS = import.meta.env.DEV ? ATHLETICA_ICS_RAW : `/api/ics-proxy?url=${encodeURIComponent(ATHLETICA_ICS_RAW)}`;

const MEAL_PLANS = {
  lowCarb: [
    { foods: [
      { name: "Eggs (3) cooked in butter", f: 21, p: 18, c: 2 },
      { name: "Avocado (½)", f: 15, p: 2, c: 6 },
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
      { name: "Oatmeal (½ cup) with berries", f: 3, p: 5, c: 20 },
      { name: "Avocado (½)", f: 15, p: 2, c: 6 },
      { name: "Turkey sausage (2 links)", f: 8, p: 14, c: 2 },
    ]},
    { foods: [
      { name: "Grilled salmon (6 oz)", f: 18, p: 40, c: 0 },
      { name: "Sweet potato (1 medium)", f: 0, p: 4, c: 26 },
      { name: "Mixed greens with olive oil", f: 14, p: 2, c: 4 },
      { name: "Quinoa (½ cup cooked)", f: 2, p: 4, c: 20 },
    ]},
    { foods: [
      { name: "Chicken breast (6 oz)", f: 4, p: 48, c: 0 },
      { name: "Brown rice (¾ cup cooked)", f: 1, p: 4, c: 34 },
      { name: "Roasted vegetables with olive oil", f: 14, p: 3, c: 10 },
      { name: "Avocado (½)", f: 15, p: 2, c: 6 },
    ]},
    { foods: [
      { name: "Greek yogurt (1 cup)", f: 5, p: 20, c: 8 },
      { name: "Almonds (1 oz)", f: 14, p: 6, c: 3 },
      { name: "Banana (½)", f: 0, p: 1, c: 14 },
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
      { name: "Avocado (½)", f: 15, p: 2, c: 6 },
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
      { name: "Greek yogurt (½ cup)", f: 3, p: 12, c: 4 },
    ]},
  ],
};

function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast">{message}</div>;
}

function App() {
  const [wellness, setWellness] = useState([]);
  const [planned, setPlanned] = useState([]);
  const [date, setDate] = useState(today());
  const [page, setPage] = useState("log");
  const [loading, setLoading] = useState(true);
  const [icsDone, setIcsDone] = useState(false);
  const [fetched, setFetched] = useState(new Set());
  const [tick, setTick] = useState(0);
  const [settings, setSettings] = useState(() => getSettings() || DEFAULT_SETTINGS);
  const [draft, setDraft] = useState(() => getSettings() || DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [toasts, setToasts] = useState([]);

  const W = settings.weight;
  const calAdj = settings.goalWeight < W ? -500 : settings.goalWeight > W ? 500 : 0;
  const refresh = () => setTick(t => t + 1);
  const showToast = (msg) => setToasts(prev => [...prev, { id: Date.now(), message: msg }]);
  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  function updateDraft(s) { setDraft(d => ({ ...d, ...s })); setSaved(false); }
  function handleSave() { setSettings(draft); saveSettings(draft); setSaved(true); setTimeout(() => setSaved(false), 2000); }

  // Fetch Athletica ICS
  useEffect(() => {
    if (icsDone) return;
    fetch(ATHLETICA_ICS).then(r => r.text()).then(t => { setPlanned(parseICS(t)); setIcsDone(true); }).catch(() => { setIcsDone(true); showToast("Couldn't load training plan from Athletica"); });
  }, []);

  // Fetch Intervals.icu wellness (now via server proxy)
  useEffect(() => {
    const m = date.slice(0, 7);
    if (fetched.has(m)) return;
    const [y, mo] = m.split("-").map(Number);
    const s = fmt(new Date(y, mo - 1, -6)), e = fmt(new Date(y, mo, 6));
    apiFetch(`wellness?oldest=${s}&newest=${e}`).then(w => {
      setWellness(prev => {
        const map = new Map(prev.map(x => [x.id, x]));
        (Array.isArray(w) ? w : []).forEach(x => map.set(x.id, x));
        return Array.from(map.values());
      });
      setFetched(prev => new Set(prev).add(m));
      setLoading(false);
    }).catch(() => { setLoading(false); showToast("Couldn't load wellness data from Intervals.icu"); });
  }, [date]);

  function shiftDate(n) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + n);
    setDate(fmt(d));
  }

  const wd = wellness.find(w => w.id === date) || {};
  const load = wd.atlLoad ?? wd.ctlLoad ?? 0;
  const dayWorkouts = planned.filter(w => w.date === date);
  const sType = getSessionTypeFromWorkouts(dayWorkouts, load);
  const session = SESSION_CONFIG[sType];
  const macros = calcMacros(sType, W, settings.height, settings.age, calAdj, settings.gender);
  const fuelRec = calcFuelRec(sType, session, W);
  const fuelRecTotal = sumFuelRec(fuelRec);

  const mealData = MEALS.map(m => ({ key: m, label: m[0].toUpperCase() + m.slice(1), entries: getLog(date, m) }));
  const mealTotals = sum(mealData.flatMap(m => m.entries));
  const trainEntries = getTLog(date);
  const trainTotals = sum(trainEntries);
  const all = { fat: mealTotals.fat + trainTotals.fat, protein: mealTotals.protein + trainTotals.protein, carbs: mealTotals.carbs + trainTotals.carbs, cal: mealTotals.cal + trainTotals.cal };

  function addMeal(meal, entry) { setLog(date, meal, [...getLog(date, meal), entry]); refresh(); }
  function rmMeal(meal, id) { setLog(date, meal, getLog(date, meal).filter(e => e.id !== id)); refresh(); }
  function addTrain(entry) { setTLog(date, [...getTLog(date), entry]); refresh(); }
  function rmTrain(id) { setTLog(date, getTLog(date).filter(e => e.id !== id)); refresh(); }

  const dayDisplay = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const userName = settings.name || "Stephanie";

  if (loading && wellness.length === 0) return <div className="app-loading">Loading your training data...</div>;

  return (
    <div className="layout">
      <div className="toast-container">
        {toasts.map(t => <Toast key={t.id} message={t.message} onDone={() => dismissToast(t.id)} />)}
      </div>
      <aside className="sidebar">
        <div className="sb-brand"><span className="sb-logo">F</span><span className="sb-name">FuelFlow</span></div>
        <nav className="sb-nav">
          <button className={page === "log" ? "active" : ""} onClick={() => setPage("log")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Daily Log
          </button>
          <button className={page === "phase" ? "active" : ""} onClick={() => setPage("phase")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Phase of Training
          </button>
          <button className={page === "meals" ? "active" : ""} onClick={() => setPage("meals")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            Meal Ideas
          </button>
          <button className={page === "settings" ? "active" : ""} onClick={() => setPage("settings")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Settings
          </button>
        </nav>
      </aside>

      <div className="mobile-nav">
        <nav>
          <button className={page === "log" ? "active" : ""} onClick={() => setPage("log")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Log
          </button>
          <button className={page === "phase" ? "active" : ""} onClick={() => setPage("phase")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Phase
          </button>
          <button className={page === "meals" ? "active" : ""} onClick={() => setPage("meals")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            Meals
          </button>
          <button className={page === "settings" ? "active" : ""} onClick={() => setPage("settings")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Settings
          </button>
        </nav>
      </div>

      <main className="main">
        <div className="topbar">
          <div className="topbar-greet">
            <h1>{greeting}, {userName}!</h1>
            <p className="topbar-phase" style={{ color: session.color }}>{session.label} — {session.target}</p>
          </div>
          <div className="topbar-date">
            <button onClick={() => shiftDate(-1)}>&larr;</button>
            <button className="topbar-today" onClick={() => setDate(today())}>TODAY</button>
            <button onClick={() => shiftDate(1)}>&rarr;</button>
          </div>
          <span className="topbar-datestr">{dayDisplay}</span>
        </div>

        {page === "log" && <>
          <div className="cards-row">
            <div className="card">
              <h2>Non-Training Fuel</h2>
              <MacroRow label="Fat" consumed={mealTotals.fat} target={Math.max(macros.fat - fuelRecTotal.fat, 0)} color="#fe00a4" />
              <MacroRow label="Protein" consumed={mealTotals.protein} target={Math.max(macros.protein - fuelRecTotal.protein, 0)} color="#043bb1" />
              <MacroRow label="Carbs" consumed={mealTotals.carbs} target={Math.max(macros.carbs - fuelRecTotal.carbs, 0)} color="#10bc10" />
              <div className="card-cal"><span>{mealTotals.cal}</span> / {Math.max(macros.cal - fuelRecTotal.cal, 0)} kcal</div>
            </div>

            <div className="card">
              <h2>Training Fuel</h2>
              <div className="fuel-recs">
                <div className="fuel-r"><span className="fuel-ph">Pre</span><span>{session.fuel.pre}</span></div>
                <div className="fuel-r"><span className="fuel-ph">During</span><span>{session.fuel.during}</span></div>
                <div className="fuel-r"><span className="fuel-ph">Post</span><span>{session.fuel.post}</span></div>
              </div>
              <div className="fuel-rec-macros">
                <div className="fuel-rec-title">Recommended Training Fuel</div>
                <div className="fuel-rec-table">
                  <div className="fuel-rec-row fuel-rec-header"><span></span><span>Carbs</span><span>Protein</span><span>Fat</span></div>
                  <div className="fuel-rec-row"><span className="fuel-ph">Pre</span><span>{fuelRec.pre.carbs}g</span><span>{fuelRec.pre.protein}g</span><span>{fuelRec.pre.fat}g</span></div>
                  <div className="fuel-rec-row"><span className="fuel-ph">During</span><span>{fuelRec.during.carbs}g</span><span>{fuelRec.during.protein}g</span><span>{fuelRec.during.fat}g</span></div>
                  <div className="fuel-rec-row"><span className="fuel-ph">Post</span><span>{fuelRec.post.carbs}g</span><span>{fuelRec.post.protein}g</span><span>{fuelRec.post.fat}g</span></div>
                  <div className="fuel-rec-row fuel-rec-total"><span>Total</span><span>{fuelRecTotal.carbs}g</span><span>{fuelRecTotal.protein}g</span><span>{fuelRecTotal.fat}g</span></div>
                </div>
                <div className="fuel-rec-cal">{fuelRecTotal.cal} kcal recommended</div>
              </div>
              {trainEntries.length > 0 && <>
                <div className="fuel-logged-head">Logged</div>
                <Entries items={trainEntries} onRemove={rmTrain} />
                <div className="fuel-sum">{trainTotals.cal} kcal — F:{trainTotals.fat}g P:{trainTotals.protein}g C:{trainTotals.carbs}g</div>
              </>}
              <FoodInput onAdd={addTrain} placeholder="Log training fuel..." />
            </div>

            <div className="card">
              <h2>Training Sessions</h2>
              {dayWorkouts.length > 0 ? dayWorkouts.map((w, i) => (
                <div key={i} className="wo">
                  <div className="wo-top">
                    <span className="wo-name">{w.summary}</span>
                    {w.duration && <span className="wo-dur">{w.duration}</span>}
                  </div>
                  <div className="wo-desc">{w.description.split("\n").filter(l => l.trim() && !l.startsWith("Duration:")).slice(0, 4).join("\n")}</div>
                  <span className="wo-badge" style={{ color: SESSION_CONFIG[classifyWorkout(w.summary)].color }}>{SESSION_CONFIG[classifyWorkout(w.summary)].label}</span>
                </div>
              )) : <p className="wo-empty">{load > 0 ? "Activity recorded — no planned workout" : "Rest day"}</p>}
              {(load > 0 || wd.ctl != null) && (
                <div className="wo-stats">
                  {load > 0 && <div><span>Load</span><strong>{load}</strong></div>}
                  {wd.ctl != null && <div><span>Fitness</span><strong>{wd.ctl.toFixed(1)}</strong></div>}
                  {wd.atl != null && <div><span>Fatigue</span><strong>{wd.atl.toFixed(1)}</strong></div>}
                </div>
              )}
            </div>
          </div>

          <div className="goals-section">
            <h2 className="goals-title">Total Macros</h2>
            <div className="goals-row">
              <Ring value={all.cal} max={macros.cal} color="#1e8ad3" label="Calories" size={120} />
              <Ring value={all.fat} max={macros.fat} color="#fe00a4" label="Fat" />
              <Ring value={all.protein} max={macros.protein} color="#043bb1" label="Protein" />
              <Ring value={all.carbs} max={macros.carbs} color="#10bc10" label="Carbs" />
            </div>
          </div>

          {mealData.map(({ key, label, entries }) => {
            const mSum = sum(entries);
            return (
              <div key={key} className="meal-card">
                <div className="meal-head">
                  <h3>{label}</h3>
                  <span className="meal-rec">Recommended: {Math.round(macros.cal / MEALS.length)} cals · {Math.round(macros.carbs / MEALS.length)}g carbs</span>
                </div>
                {entries.length === 0 && <p className="meal-empty">No foods logged yet — search or scan to add</p>}
                <Entries items={entries} onRemove={(id) => rmMeal(key, id)} />
                {mSum.cal > 0 && <div className="meal-sum">{mSum.cal} kcal — F:{mSum.fat}g P:{mSum.protein}g C:{mSum.carbs}g</div>}
                <FoodInput onAdd={(entry) => addMeal(key, entry)} placeholder={`+ Add ${label}`} />
              </div>
            );
          })}
        </>}

        {page === "phase" && (
          <div className="page-content">
            <h2>Phase of Training</h2>
            <div className="phase-current">
              <div className="phase-badge" style={{ background: session.color }}>{session.label}</div>
              <p>{session.note}</p>
            </div>
            <h3>Carb Periodization Guide (Dr. Plews)</h3>
            <div className="phase-table">
              {Object.entries(SESSION_CONFIG).map(([key, s]) => (
                <div key={key} className={`phase-row ${key === sType ? "active" : ""}`}>
                  <span className="phase-dot" style={{ background: s.color }} />
                  <span className="phase-name">{s.label}</span>
                  <span className="phase-target">{s.target}</span>
                  <span className="phase-carb">{s.carbGkg} g/kg CHO</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === "meals" && (() => {
          const mf = macros.fat, mp = macros.protein, mc = macros.carbs, mcal = macros.cal;
          const lowCarb = ["rest", "endurance", "lowerTempo"].includes(sType);
          const midCarb = sType === "upperTempo";
          const dist = [
            { meal: "Breakfast", pct: 0.25 },
            { meal: "Lunch", pct: 0.30 },
            { meal: "Dinner", pct: 0.30 },
            { meal: "Snack", pct: 0.15 },
          ].map(d => ({ ...d, fat: Math.round(mf * d.pct), protein: Math.round(mp * d.pct), carbs: Math.round(mc * d.pct), cal: Math.round(mcal * d.pct) }));

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
              <div className="mp-note">
                <strong>Session note:</strong> {session.note}
              </div>
            </div>
          );
        })()}

        {page === "settings" && (
          <div className="page-content">
            <h2>Settings</h2>
            <p className="page-sub">Set your goals and personal info. Macros will adjust automatically.</p>

            <div className="settings-card">
              <h3>Your Profile</h3>
              <div className="settings-grid">
                <label className="sett-field">
                  <span>Name</span>
                  <input type="text" value={draft.name || ""} onChange={e => updateDraft({ name: e.target.value })} />
                </label>
                <label className="sett-field">
                  <span>Starting Weight (lbs)</span>
                  <input type="number" value={draft.weight} onChange={e => updateDraft({ weight: Number(e.target.value) || 0 })} />
                </label>
                <label className="sett-field">
                  <span>Start Date</span>
                  <input type="date" value={draft.startDate} onChange={e => updateDraft({ startDate: e.target.value })} />
                </label>
                <label className="sett-field">
                  <span>Height (inches)</span>
                  <input type="number" value={draft.height} onChange={e => updateDraft({ height: Number(e.target.value) || 0 })} />
                </label>
                <label className="sett-field">
                  <span>Age</span>
                  <input type="number" value={draft.age} onChange={e => updateDraft({ age: Number(e.target.value) || 0 })} />
                </label>
                <label className="sett-field">
                  <span>Gender</span>
                  <select value={draft.gender || "female"} onChange={e => updateDraft({ gender: e.target.value })}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="settings-card">
              <h3>Weight Goal</h3>
              <div className="settings-grid">
                <label className="sett-field">
                  <span>Goal Weight (lbs)</span>
                  <input type="number" value={draft.goalWeight} onChange={e => updateDraft({ goalWeight: Number(e.target.value) || 0 })} />
                </label>
              </div>
            </div>

            <button className="sett-save" onClick={handleSave}>{saved ? "Saved!" : "Save Settings"}</button>

            <div className="settings-card">
              <h3>Connections</h3>
              <div className="conn-list">
                <div className="conn connected"><div className="conn-info"><strong>Intervals.icu</strong><span>Wellness data, training load, fitness metrics</span></div><span className="conn-status on">Connected</span></div>
                <div className="conn connected"><div className="conn-info"><strong>Athletica.ai</strong><span>Planned workouts, training plan calendar</span></div><span className="conn-status on">Connected</span></div>
                <div className="conn connected"><div className="conn-info"><strong>FatSecret</strong><span>Food search, nutrition data, and barcode lookup</span></div><span className="conn-status on">Connected</span></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
