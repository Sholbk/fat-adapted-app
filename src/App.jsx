import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import "./App.css";

const API_KEY = import.meta.env.VITE_INTERVALS_API_KEY;
const ATHLETE_ID = import.meta.env.VITE_INTERVALS_ATHLETE_ID;
const BASE_URL = `https://intervals.icu/api/v1/athlete/${ATHLETE_ID}`;
const ATHLETICA_ICS_RAW = "https://app.athletica.ai/4935a810a4/athletica.ics";
const ATHLETICA_ICS = import.meta.env.DEV ? ATHLETICA_ICS_RAW : `/api/ics-proxy?url=${encodeURIComponent(ATHLETICA_ICS_RAW)}`;

// ── Helpers ──
function fmt(d) { return d.toISOString().split("T")[0]; }
function today() { return fmt(new Date()); }

function parseICS(text) {
  const events = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const get = (key) => { const m = block.match(new RegExp(`^${key}[^:]*:(.+)`, "m")); return m ? m[1].trim() : ""; };
    const unfolded = block.replace(/\r?\n[ \t]/g, "");
    const getU = (key) => { const m = unfolded.match(new RegExp(`^${key}[^:]*:(.+)`, "m")); return m ? m[1].trim() : ""; };
    const summary = getU("SUMMARY").replace(/\\\\/g, "\\").replace(/\\,/g, ",").replace(/\\"/g, '"');
    const desc = getU("DESCRIPTION").replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\\\/g, "\\").replace(/\\"/g, '"');
    const dtRaw = get("DTSTART");
    const dm = dtRaw.match(/(\d{4})(\d{2})(\d{2})/);
    if (!dm) continue;
    const date = `${dm[1]}-${dm[2]}-${dm[3]}`;
    const durM = desc.match(/Duration:\s*([^\n]+)/);
    events.push({ date, summary, description: desc, duration: durM ? durM[1].trim() : "" });
  }
  return events;
}

function classifyWorkout(summary) {
  const s = summary.toLowerCase();
  if (s.includes("hiit") || s.includes("vo2") || s.includes("interval")) return "vo2max";
  if (s.includes("threshold") || s.includes("strength endurance") || s.includes("se ")) return "threshold";
  if (s.includes("tempo")) return "upperTempo";
  if (s.includes("aerobic") || s.includes("steady") || s.includes("development")) return "endurance";
  if (s.includes("strength") || s.includes("weight training") || s.includes("conditioning") || s.includes("s&c") || s.includes("gym")) return "endurance";
  if (s.includes("run off the bike") || s.includes("rob")) return "upperTempo";
  return "endurance";
}

function getSessionType(load) {
  if (!load || load === 0) return "rest";
  if (load <= 20) return "endurance";
  if (load <= 40) return "lowerTempo";
  if (load <= 60) return "upperTempo";
  if (load <= 85) return "threshold";
  if (load <= 120) return "vo2max";
  return "anaerobic";
}

function getSessionTypeFromWorkouts(workouts, load) {
  if (workouts.length === 0) return load > 0 ? getSessionType(load) : "rest";
  const pri = ["anaerobic", "vo2max", "threshold", "upperTempo", "lowerTempo", "endurance", "rest"];
  let best = "rest";
  for (const w of workouts) { const t = classifyWorkout(w.summary); if (pri.indexOf(t) < pri.indexOf(best)) best = t; }
  return best;
}

const S = {
  rest: { label: "Rest Day", color: "#1e8ad3", target: "Recovery & repair", carbGkg: 0.5, proteinGkg: 1.6, calMul: 1.0, fuel: { pre: "Protein, healthy fats, low CHO", during: "N/A", post: "Protein" }, note: "Keep carbs low. Prioritize protein and healthy fats for recovery." },
  endurance: { label: "Endurance", color: "#10bc10", target: "Increase fat oxidation", carbGkg: 0.8, proteinGkg: 1.8, calMul: 1.15, fuel: { pre: "Protein, healthy fats — restrict CHO", during: "Fat-based fuels, electrolytes. CHO only after ~120 min", post: "Protein" }, note: "Restrict carbs to maximize fat oxidation. CHO only after ~2 hours." },
  lowerTempo: { label: "Lower Tempo", color: "#10bc10", target: "Fat oxidation + sustain intensity", carbGkg: 1.0, proteinGkg: 1.8, calMul: 1.2, fuel: { pre: "Protein, healthy fats — low CHO", during: "Fat-based fuels, electrolytes. CHO after ~90 min", post: "Protein" }, note: "Fat-fueled early, introduce CHO after ~90 min." },
  upperTempo: { label: "Upper Tempo", color: "#1e8ad3", target: "Fat oxidation + sustain intensity", carbGkg: 1.5, proteinGkg: 2.0, calMul: 1.3, fuel: { pre: "Protein, healthy fats, moderate CHO", during: "Fat-based early, CHO after ~60 min", post: "Protein" }, note: "Low-to-moderate carbs pre. Add CHO after ~60 min." },
  threshold: { label: "Threshold", color: "#043bb1", target: "Sustain intensity", carbGkg: 2.5, proteinGkg: 2.0, calMul: 1.4, fuel: { pre: "Protein, moderate CHO", during: "CHO, electrolytes, caffeine from ~30 min", post: "CHO + Protein" }, note: "Fuel this session. CHO + electrolytes + caffeine during." },
  vo2max: { label: "VO2max", color: "#fe00a4", target: "Maximize work rate", carbGkg: 3.0, proteinGkg: 2.2, calMul: 1.5, fuel: { pre: "CHO + Protein — top up glycogen", during: "Electrolytes, caffeine. CHO from ~20 min", post: "CHO + Protein" }, note: "Full glycogen. AMPK not blunted here — fuel for max output." },
  anaerobic: { label: "Anaerobic", color: "#fe00a4", target: "Maximize work rate", carbGkg: 3.0, proteinGkg: 2.2, calMul: 1.5, fuel: { pre: "CHO + Protein", during: "Electrolytes, caffeine from ~20 min", post: "CHO + Protein" }, note: "Full carb support for short maximal efforts." },
};

function calcMacros(type, lbs, heightIn, age, calAdj, gender) {
  const kg = lbs / 2.205, s = S[type];
  const heightCm = heightIn * 2.54;
  const bmr = 10 * kg + 6.25 * heightCm - 5 * age + (gender === "male" ? 5 : -161);
  const tdee = bmr * 1.55 * s.calMul + (calAdj || 0);
  const p = Math.round(s.proteinGkg * kg), c = Math.round(s.carbGkg * kg);
  return { cal: Math.round(tdee), fat: Math.round(Math.max(tdee - p * 4 - c * 4, 0) / 9), protein: p, carbs: c };
}

function getSettings() {
  try { return JSON.parse(localStorage.getItem("ff-settings") || "null"); } catch { return null; }
}
function saveSettings(s) { localStorage.setItem("ff-settings", JSON.stringify(s)); }
const DEFAULT_SETTINGS = { weight: 213, startDate: new Date().toISOString().slice(0, 10), height: 65, age: 35, gender: "female", goalWeight: 213 };

async function apiFetch(ep) {
  const r = await fetch(`${BASE_URL}/${ep}`, { headers: { Authorization: `Basic ${btoa(`API_KEY:${API_KEY}`)}`, Accept: "application/json" } });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

// ── Storage ──
const MEALS = ["breakfast", "lunch", "dinner", "snack"];
function getLog(d, m) { try { return JSON.parse(localStorage.getItem(`ff-${m}-${d}`) || "[]"); } catch { return []; } }
function setLog(d, m, e) { localStorage.setItem(`ff-${m}-${d}`, JSON.stringify(e)); }
function getTLog(d) { try { return JSON.parse(localStorage.getItem(`ff-train-${d}`) || "[]"); } catch { return []; } }
function setTLog(d, e) { localStorage.setItem(`ff-train-${d}`, JSON.stringify(e)); }
function sum(entries) { return entries.reduce((a, e) => ({ fat: a.fat + e.fat, protein: a.protein + e.protein, carbs: a.carbs + e.carbs, cal: a.cal + e.fat * 9 + e.protein * 4 + e.carbs * 4 }), { fat: 0, protein: 0, carbs: 0, cal: 0 }); }

async function searchUSDA(q) {
  const r = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=MBa8H80xhD5i9nC0RcvTviRh7WKzGn92RafcnMsR&query=${encodeURIComponent(q)}&pageSize=5&dataType=Survey%20(FNDDS),Foundation,SR%20Legacy`);
  if (!r.ok) return [];
  const d = await r.json();
  return (d.foods || []).map((f) => {
    const g = (n) => { const x = f.foodNutrients?.find((x) => x.nutrientName === n); return x ? Math.round(x.value) : 0; };
    return { name: f.description, fat: g("Total lipid (fat)"), protein: g("Protein"), carbs: g("Carbohydrate, by difference"), serving: f.servingSize ? `${f.servingSize}${f.servingSizeUnit || "g"}` : "100g", src: "USDA" };
  });
}

async function searchOFF(q) {
  try {
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=5`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.products || []).filter(p => p.product_name).map(p => {
      const n = p.nutriments || {};
      return { name: p.product_name, fat: Math.round(n.fat_100g || 0), protein: Math.round(n.proteins_100g || 0), carbs: Math.round(n.carbohydrates_100g || 0), serving: p.serving_size || "100g", src: "OFF" };
    });
  } catch { return []; }
}

async function searchAllFoods(q) {
  const [usda, off] = await Promise.all([searchUSDA(q), searchOFF(q)]);
  const seen = new Set();
  return [...usda, ...off].filter(f => { const k = f.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
}

async function lookupBarcode(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
  if (!r.ok) return null;
  const d = await r.json();
  if (d.status !== 1 || !d.product) return null;
  const p = d.product, n = p.nutriments || {};
  return {
    name: p.product_name || p.generic_name || "Unknown product",
    fat: Math.round(n.fat_serving || n.fat_100g || 0),
    protein: Math.round(n.proteins_serving || n.proteins_100g || 0),
    carbs: Math.round(n.carbohydrates_serving || n.carbohydrates_100g || 0),
    serving: p.serving_size || "100g",
  };
}

function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const stoppedRef = useRef(false);
  const idRef = useRef("barcode-reader-" + Date.now());
  const [error, setError] = useState("");

  useEffect(() => {
    let scanner = null;
    stoppedRef.current = false;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(idRef.current, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 250, height: 150 } },
          (code) => {
            if (stoppedRef.current) return;
            stoppedRef.current = true;
            scanner.stop().then(() => { scanner.clear(); }).catch(() => {});
            onScan(code);
          },
          () => {}
        );
      } catch (err) {
        setError("Camera access denied or unavailable. Check permissions.");
      }
    };

    startScanner();

    return () => {
      stoppedRef.current = true;
      if (scanner) {
        const s = scanner.getState && scanner.getState();
        if (s === 2) { // SCANNING
          scanner.stop().then(() => { scanner.clear(); }).catch(() => {});
        } else {
          try { scanner.clear(); } catch {}
        }
      }
    };
  }, []);

  function handleClose() {
    stoppedRef.current = true;
    const scanner = scannerRef.current;
    if (scanner) {
      const s = scanner.getState && scanner.getState();
      if (s === 2) {
        scanner.stop().then(() => { scanner.clear(); onClose(); }).catch(() => { onClose(); });
        return;
      }
      try { scanner.clear(); } catch {}
    }
    onClose();
  }

  return (
    <div className="scanner-overlay" onClick={handleClose}>
      <div className="scanner-box" onClick={e => e.stopPropagation()}>
        <div className="scanner-head">
          <span>Scan Barcode</span>
          <button onClick={handleClose}>×</button>
        </div>
        <div id={idRef.current}></div>
        {error ? <p className="scanner-hint" style={{ color: "#fe00a4" }}>{error}</p>
          : <p className="scanner-hint">Point camera at a food barcode</p>}
      </div>
    </div>
  );
}

// ── Small Components ──

function Ring({ value, max, color, label, size = 90 }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - 10) / 2, circ = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#dddddd" strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dashoffset 0.4s" }} />
      </svg>
      <div className="ring-inner">
        <span className="ring-v">{value}</span>
        <span className="ring-max">/ {max}</span>
        <span className="ring-l">{label}</span>
      </div>
    </div>
  );
}

function FoodInput({ onAdd, placeholder }) {
  const [name, setName] = useState(""); const [amt, setAmt] = useState("1"); const [unit, setUnit] = useState("item");
  const [fat, setFat] = useState(""); const [pro, setPro] = useState(""); const [carb, setCarb] = useState("");
  const [results, setResults] = useState([]); const [busy, setBusy] = useState(false); const t = useRef(null);
  const [scanning, setScanning] = useState(false); const [scanMsg, setScanMsg] = useState("");
  const baseFat = useRef(0), basePro = useRef(0), baseCarb = useRef(0);
  function onN(v) {
    setName(v); clearTimeout(t.current);
    if (v.trim().length < 2) { setResults([]); return; }
    t.current = setTimeout(async () => { setBusy(true); setResults(await searchAllFoods(v)); setBusy(false); }, 400);
  }
  function pick(f) {
    setName(f.name); setFat(String(f.fat)); setPro(String(f.protein)); setCarb(String(f.carbs)); setResults([]);
    baseFat.current = f.fat; basePro.current = f.protein; baseCarb.current = f.carbs;
  }
  async function handleScan(code) {
    setScanning(false); setScanMsg("Looking up barcode...");
    try {
      const food = await lookupBarcode(code);
      if (food) { setName(food.name); setFat(String(food.fat)); setPro(String(food.protein)); setCarb(String(food.carbs)); setScanMsg(""); baseFat.current = food.fat; basePro.current = food.protein; baseCarb.current = food.carbs; }
      else { setScanMsg("Product not found. Try searching manually."); setTimeout(() => setScanMsg(""), 3000); }
    } catch { setScanMsg("Lookup failed. Try again."); setTimeout(() => setScanMsg(""), 3000); }
  }
  function submit(e) {
    e.preventDefault(); if (!name.trim()) return;
    const a = Math.max(+amt || 1, 0.1);
    const label = a !== 1 ? `${name.trim()} (${a} ${unit})` : `${name.trim()} (1 ${unit})`;
    onAdd({ id: Date.now(), name: label, fat: Math.round((+fat || 0) * a), protein: Math.round((+pro || 0) * a), carbs: Math.round((+carb || 0) * a) });
    setName(""); setAmt("1"); setUnit("item"); setFat(""); setPro(""); setCarb(""); setResults([]);
    baseFat.current = 0; basePro.current = 0; baseCarb.current = 0;
  }
  return (
    <>
      <form className="fi" onSubmit={submit}>
        <div className="fi-s">
          <input placeholder={placeholder || "Search food..."} value={name} onChange={e => onN(e.target.value)} onBlur={() => setTimeout(() => setResults([]), 200)} />
          {(results.length > 0 || busy) && <div className="fi-drop">
            {busy && <div className="fi-load">Searching USDA + Open Food Facts...</div>}
            {results.map((f, i) => <button key={i} type="button" onMouseDown={() => pick(f)}><strong>{f.name}</strong><span>F:{f.fat} P:{f.protein} C:{f.carbs} — {f.serving} <em>{f.src}</em></span></button>)}
          </div>}
        </div>
        <input type="number" placeholder="Amt" value={amt} onChange={e => setAmt(e.target.value)} className="fi-q" min="0.1" step="0.1" />
        <select value={unit} onChange={e => setUnit(e.target.value)} className="fi-unit">
          <option value="item">item</option>
          <option value="oz">oz</option>
          <option value="g">g</option>
          <option value="cup">cup</option>
          <option value="tbsp">tbsp</option>
          <option value="tsp">tsp</option>
          <option value="lb">lb</option>
          <option value="ml">ml</option>
          <option value="slice">slice</option>
          <option value="scoop">scoop</option>
        </select>
        <input type="number" placeholder="Fat" value={fat} onChange={e => setFat(e.target.value)} className="fi-n" min="0" />
        <input type="number" placeholder="Pro" value={pro} onChange={e => setPro(e.target.value)} className="fi-n" min="0" />
        <input type="number" placeholder="Carb" value={carb} onChange={e => setCarb(e.target.value)} className="fi-n" min="0" />
        <button type="button" className="fi-scan" onClick={() => setScanning(true)} title="Scan barcode">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="11" y1="8" x2="11" y2="16"/><line x1="15" y1="8" x2="15" y2="16"/><line x1="19" y1="8" x2="19" y2="16"/></svg>
        </button>
        <button type="submit" className="fi-btn">+</button>
      </form>
      {scanMsg && <div className="scan-msg">{scanMsg}</div>}
      {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </>
  );
}

function Entries({ items, onRemove }) {
  return items.length ? <div className="ent-list">{items.map(e => (
    <div key={e.id} className="ent"><span className="ent-n">{e.name}</span><span className="ent-m">F:{e.fat} P:{e.protein} C:{e.carbs}</span><button onClick={() => onRemove(e.id)}>×</button></div>
  ))}</div> : null;
}

function MacroRow({ label, consumed, target, color }) {
  const pct = target > 0 ? Math.min(consumed / target * 100, 100) : 0;
  const left = target - consumed;
  return (
    <div className="mrow">
      <div className="mrow-top"><span className="mrow-dot" style={{ background: color }} /><span className="mrow-label">{label}</span><span className="mrow-val">{consumed}g / {target}g</span></div>
      <div className="mrow-bar"><div style={{ width: `${pct}%`, background: consumed > target ? "#fe00a4" : color }} /></div>
      <span className="mrow-left">{left >= 0 ? `${left}g left` : `${Math.abs(left)}g over`}</span>
    </div>
  );
}

// ── App ──

function App() {
  const now = new Date();
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
  const W = settings.weight;
  const calAdj = settings.goalWeight < W ? -500 : settings.goalWeight > W ? 500 : 0;
  const refresh = () => setTick(t => t + 1);
  function updateDraft(s) { setDraft(d => ({ ...d, ...s })); setSaved(false); }
  function handleSave() { setSettings(draft); saveSettings(draft); setSaved(true); setTimeout(() => setSaved(false), 2000); }

  // Fetch Athletica ICS
  useEffect(() => { if (icsDone) return; fetch(ATHLETICA_ICS).then(r => r.text()).then(t => { setPlanned(parseICS(t)); setIcsDone(true); }).catch(() => setIcsDone(true)); }, []);

  // Fetch Intervals.icu wellness
  useEffect(() => {
    const m = date.slice(0, 7);
    if (fetched.has(m)) return;
    const [y, mo] = m.split("-").map(Number);
    const s = fmt(new Date(y, mo - 1, -6)), e = fmt(new Date(y, mo, 6));
    apiFetch(`wellness?oldest=${s}&newest=${e}`).then(w => {
      setWellness(prev => { const map = new Map(prev.map(x => [x.id, x])); (Array.isArray(w) ? w : []).forEach(x => map.set(x.id, x)); return Array.from(map.values()); });
      setFetched(prev => new Set(prev).add(m)); setLoading(false);
    }).catch(() => setLoading(false));
  }, [date]);

  // Navigate date
  function shiftDate(n) {
    const d = new Date(date + "T00:00:00"); d.setDate(d.getDate() + n);
    setDate(fmt(d));
  }

  const wd = wellness.find(w => w.id === date) || {};
  const load = wd.atlLoad || wd.ctlLoad || 0;
  const dayWorkouts = planned.filter(w => w.date === date);
  const sType = getSessionTypeFromWorkouts(dayWorkouts, load);
  const session = S[sType];
  const macros = calcMacros(sType, W, settings.height, settings.age, calAdj, settings.gender);

  // Recommended training fuel macros (pre/during/post) based on session type & body weight
  const kg = W / 2.205;
  const fuelRec = (() => {
    const t = sType;
    if (t === "rest") return { pre: { carbs: 0, protein: 0, fat: 0 }, during: { carbs: 0, protein: 0, fat: 0 }, post: { carbs: 0, protein: 0, fat: 0 } };
    const totalCarb = Math.round(session.carbGkg * kg);
    const totalPro = Math.round(session.proteinGkg * kg);
    // Distribute ~40% of daily carbs as training fuel (pre 30%, during 40%, post 30%)
    const trainCarb = Math.round(totalCarb * 0.4);
    const trainPro = Math.round(totalPro * 0.25);
    if (["endurance", "lowerTempo"].includes(t)) {
      // Fat-adapted: minimal carbs pre, fat-based during, protein-only post (no carbs post per Plews)
      return { pre: { carbs: 0, protein: Math.round(trainPro * 0.4), fat: 15 }, during: { carbs: 0, protein: 0, fat: 15 }, post: { carbs: 0, protein: Math.round(trainPro * 0.6), fat: 5 } };
    }
    if (t === "upperTempo") {
      // Pre: low-moderate CHO. During: fat-based early, CHO after ~60 min. Post: protein only
      return { pre: { carbs: Math.round(trainCarb * 0.3), protein: Math.round(trainPro * 0.4), fat: 10 }, during: { carbs: Math.round(trainCarb * 0.7), protein: 0, fat: 5 }, post: { carbs: 0, protein: Math.round(trainPro * 0.6), fat: 5 } };
    }
    // threshold, vo2max, anaerobic — full carb support
    return { pre: { carbs: Math.round(trainCarb * 0.3), protein: Math.round(trainPro * 0.4), fat: 5 }, during: { carbs: Math.round(trainCarb * 0.45), protein: 0, fat: 0 }, post: { carbs: Math.round(trainCarb * 0.25), protein: Math.round(trainPro * 0.6), fat: 5 } };
  })();
  const fuelRecTotal = { carbs: fuelRec.pre.carbs + fuelRec.during.carbs + fuelRec.post.carbs, protein: fuelRec.pre.protein + fuelRec.during.protein + fuelRec.post.protein, fat: fuelRec.pre.fat + fuelRec.during.fat + fuelRec.post.fat };
  fuelRecTotal.cal = fuelRecTotal.carbs * 4 + fuelRecTotal.protein * 4 + fuelRecTotal.fat * 9;

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
  const greeting = new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 17 ? "Good Afternoon" : "Good Evening";

  if (loading && wellness.length === 0) return <div className="app-loading">Loading your training data...</div>;

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
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

      {/* ── Main ── */}
      <main className="main">
        {/* Top bar */}
        <div className="topbar">
          <div className="topbar-greet">
            <h1>{greeting}, Stephanie!</h1>
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
          {/* ── Top Cards Row ── */}
          <div className="cards-row">
            {/* Non-Training Fuel */}
            <div className="card">
              <h2>Non-Training Fuel</h2>
              <MacroRow label="Fat" consumed={mealTotals.fat} target={Math.max(macros.fat - fuelRecTotal.fat, 0)} color="#fe00a4" />
              <MacroRow label="Protein" consumed={mealTotals.protein} target={Math.max(macros.protein - fuelRecTotal.protein, 0)} color="#043bb1" />
              <MacroRow label="Carbs" consumed={mealTotals.carbs} target={Math.max(macros.carbs - fuelRecTotal.carbs, 0)} color="#10bc10" />
              <div className="card-cal"><span>{mealTotals.cal}</span> / {Math.max(macros.cal - fuelRecTotal.cal, 0)} kcal</div>
            </div>

            {/* My Training Macros */}
            <div className="card">
              <h2>My Training Fuel</h2>
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

            {/* Training Sessions */}
            <div className="card">
              <h2>Training Sessions</h2>
              {dayWorkouts.length > 0 ? dayWorkouts.map((w, i) => (
                <div key={i} className="wo">
                  <div className="wo-top">
                    <span className="wo-name">{w.summary}</span>
                    {w.duration && <span className="wo-dur">{w.duration}</span>}
                  </div>
                  <div className="wo-desc">{w.description.split("\n").filter(l => l.trim() && !l.startsWith("Duration:")).slice(0, 4).join("\n")}</div>
                  <span className="wo-badge" style={{ color: S[classifyWorkout(w.summary)].color }}>{S[classifyWorkout(w.summary)].label}</span>
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

          {/* Total Macros */}
          <div className="goals-section">
            <h2 className="goals-title">Total Macros</h2>
            <div className="goals-row">
              <Ring value={all.cal} max={macros.cal} color="#1e8ad3" label="Calories" size={120} />
              <Ring value={all.fat} max={macros.fat} color="#fe00a4" label="Fat" />
              <Ring value={all.protein} max={macros.protein} color="#043bb1" label="Protein" />
              <Ring value={all.carbs} max={macros.carbs} color="#10bc10" label="Carbs" />
            </div>
          </div>

          {/* ── Meal Sections ── */}
          {mealData.map(({ key, label, entries }) => {
            const mSum = sum(entries);
            return (
              <div key={key} className="meal-card">
                <div className="meal-head">
                  <h3>{label}</h3>
                  <span className="meal-rec">Recommended: {Math.round(macros.cal / MEALS.length)} cals · {Math.round(macros.carbs / MEALS.length)}g carbs</span>
                </div>
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
              {Object.entries(S).map(([key, s]) => (
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
          // Distribute macros: Breakfast 25%, Lunch 30%, Dinner 30%, Snack 15%
          const dist = [
            { meal: "Breakfast", pct: 0.25 },
            { meal: "Lunch", pct: 0.30 },
            { meal: "Dinner", pct: 0.30 },
            { meal: "Snack", pct: 0.15 },
          ].map(d => ({ ...d, fat: Math.round(mf * d.pct), protein: Math.round(mp * d.pct), carbs: Math.round(mc * d.pct), cal: Math.round(mcal * d.pct) }));

          const plans = lowCarb ? [
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
          ] : midCarb ? [
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
          ] : [
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
          ];

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
              );})}
            </div>
            <div className="mp-note">
              <strong>Session note:</strong> {session.note}
            </div>
          </div>
        );})()}

        {page === "settings" && (
          <div className="page-content">
            <h2>Settings</h2>
            <p className="page-sub">Set your goals and personal info. Macros will adjust automatically.</p>

            <div className="settings-card">
              <h3>Your Profile</h3>
              <div className="settings-grid">
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
                <div className="conn connected"><div className="conn-info"><strong>USDA FoodData Central</strong><span>Food search and nutritional data</span></div><span className="conn-status on">Connected</span></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
