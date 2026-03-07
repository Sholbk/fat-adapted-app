import { useState, useEffect } from "react";
import "./App.css";

import { fmt, today, parseICS } from "./utils/parsing.js";
import { getSessionTypeFromWorkouts } from "./utils/classification.js";
import { SESSION_CONFIG, calcMacros, calcFuelRec, sumFuelRec } from "./utils/macros.js";
import { MEALS, getSettings, saveSettings, DEFAULT_SETTINGS, getLog, setLog, getTLog, setTLog, sum } from "./utils/storage.js";
import { apiFetch } from "./utils/api.js";
import { isSupabaseConfigured, getSession, onAuthChange, backupToCloud } from "./utils/supabase.js";

import Sidebar from "./components/Sidebar.jsx";
import MobileNav from "./components/MobileNav.jsx";
import Topbar from "./components/Topbar.jsx";

import DailyLog from "./pages/DailyLog.jsx";
import WeeklySummary from "./pages/WeeklySummary.jsx";
import PhaseOfTraining from "./pages/PhaseOfTraining.jsx";
import MealIdeas from "./pages/MealIdeas.jsx";
import RecipeBuilder from "./pages/RecipeBuilder.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

function getIcsUrl(raw) {
  if (!raw) return null;
  return import.meta.env.DEV ? raw : `/api/ics-proxy?url=${encodeURIComponent(raw)}`;
}

function Toast({ message, onDone, onUndo }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast">{message}{onUndo && <button className="toast-undo" onClick={() => { onUndo(); onDone(); }}>Undo</button>}</div>;
}

function App() {
  const [wellness, setWellness] = useState([]);
  const [planned, setPlanned] = useState([]);
  const [date, setDate] = useState(today());
  const [page, setPage] = useState("log");
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(new Set());
  const [tick, setTick] = useState(0);
  const [settings, setSettings] = useState(() => getSettings() || DEFAULT_SETTINGS);
  const [draft, setDraft] = useState(() => getSettings() || DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [authSession, setAuthSession] = useState(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "", mode: "login" });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    getSession().then(s => setAuthSession(s));
    const { data } = onAuthChange(s => setAuthSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "/") { e.preventDefault(); const fi = document.querySelector(".fi-s input"); if (fi) fi.focus(); }
      if (e.key === "ArrowLeft") shiftDate(-1);
      if (e.key === "ArrowRight") shiftDate(1);
      if (e.key === "t" || e.key === "T") setDate(today());
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const W = settings.weight;
  const calAdj = settings.goalWeight < W ? -500 : settings.goalWeight > W ? 500 : 0;
  const refresh = () => {
    setTick(t => t + 1);
    if (authSession?.user?.id) backupToCloud(authSession.user.id);
  };
  const showToast = (msg, onUndo) => setToasts(prev => [...prev, { id: Date.now(), message: msg, onUndo }]);
  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  function updateDraft(s) { setDraft(d => ({ ...d, ...s })); setSaved(false); }
  function handleSave() { setSettings(draft); saveSettings(draft); setSaved(true); setTimeout(() => setSaved(false), 2000); }

  useEffect(() => {
    const icsUrl = getIcsUrl(settings.athleticaUrl);
    if (!icsUrl) { setPlanned([]); return; }
    fetch(icsUrl).then(r => r.text()).then(t => { setPlanned(parseICS(t)); }).catch(() => { showToast("Couldn't load training plan from Athletica"); });
  }, [settings.athleticaUrl]);

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
    if (n === 0) { setDate(today()); return; }
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
  function rmMeal(meal, id) {
    const prev = getLog(date, meal);
    const removed = prev.find(e => e.id === id);
    setLog(date, meal, prev.filter(e => e.id !== id));
    refresh();
    if (removed) showToast(`Removed ${removed.name.split("(")[0].trim()}`, () => { setLog(date, meal, [...getLog(date, meal), removed]); refresh(); });
  }
  function addTrain(entry) { setTLog(date, [...getTLog(date), entry]); refresh(); }
  function rmTrain(id) {
    const prev = getTLog(date);
    const removed = prev.find(e => e.id === id);
    setTLog(date, prev.filter(e => e.id !== id));
    refresh();
    if (removed) showToast(`Removed ${removed.name.split("(")[0].trim()}`, () => { setTLog(date, [...getTLog(date), removed]); refresh(); });
  }

  const userName = settings.name || "Stephanie";

  if (loading && wellness.length === 0) return <div className="app-loading">Loading your training data...</div>;

  return (
    <div className={`layout${settings.darkMode ? " dark" : ""}`}>
      <div className="toast-container">
        {toasts.map(t => <Toast key={t.id} message={t.message} onDone={() => dismissToast(t.id)} onUndo={t.onUndo} />)}
      </div>

      <Sidebar page={page} setPage={setPage} />
      <MobileNav page={page} setPage={setPage} />

      <main className="main">
        <Topbar date={date} shiftDate={shiftDate} settings={settings} setSettings={setSettings} session={session} userName={userName} />

        {page === "log" && (
          <DailyLog
            date={date} macros={macros} session={session} sType={sType}
            fuelRec={fuelRec} fuelRecTotal={fuelRecTotal}
            dayWorkouts={dayWorkouts} wellness={wellness}
            mealData={mealData} mealTotals={mealTotals}
            trainEntries={trainEntries} trainTotals={trainTotals} all={all}
            addMeal={addMeal} rmMeal={rmMeal} addTrain={addTrain} rmTrain={rmTrain}
            refresh={refresh} showToast={showToast} settings={settings}
          />
        )}

        {page === "weekly" && (
          <WeeklySummary
            date={date} setDate={setDate} setPage={setPage}
            planned={planned} wellness={wellness} settings={settings}
          />
        )}

        {page === "phase" && (
          <PhaseOfTraining session={session} sType={sType} wellness={wellness} />
        )}

        {page === "meals" && (
          <MealIdeas
            date={date} macros={macros} session={session} sType={sType}
            refresh={refresh} showToast={showToast} setPage={setPage}
          />
        )}

        {page === "recipes" && (
          <RecipeBuilder
            date={date} refresh={refresh} showToast={showToast} addMeal={addMeal}
          />
        )}

        {page === "settings" && (
          <SettingsPage
            date={date} draft={draft} updateDraft={updateDraft}
            handleSave={handleSave} saved={saved}
            settings={settings} setSettings={setSettings} setDraft={setDraft}
            refresh={refresh} showToast={showToast}
            authSession={authSession} setAuthSession={setAuthSession}
            authForm={authForm} setAuthForm={setAuthForm}
            syncing={syncing} setSyncing={setSyncing}
          />
        )}
      </main>
    </div>
  );
}

export default App;
