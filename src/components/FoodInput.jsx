import { useState, useRef } from "react";
import { searchFoods, getFoodServings, lookupBarcode } from "../utils/api.js";
import BarcodeScanner from "./BarcodeScanner.jsx";

const RECENTS_KEY = "ff_recent_foods";
const MAX_RECENTS = 15;

function getRecents() {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY)) || []; } catch { return []; }
}

function saveRecent(food) {
  const recents = getRecents().filter(r => r.id !== food.id);
  recents.unshift(food);
  if (recents.length > MAX_RECENTS) recents.length = MAX_RECENTS;
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
}

export default function FoodInput({ onAdd, placeholder }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [fat, setFat] = useState("");
  const [pro, setPro] = useState("");
  const [carb, setCarb] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const debounce = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [servings, setServings] = useState([]);
  const [selServing, setSelServing] = useState(null);
  const baseMacros = useRef(null);
  const abortRef = useRef(null);
  const [showRecents, setShowRecents] = useState(false);

  function onNameChange(v) {
    setName(v);
    clearTimeout(debounce.current);
    baseMacros.current = null;
    setServings([]);
    setSelServing(null);
    setShowRecents(v.trim().length === 0);
    if (v.trim().length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);
      try {
        const res = await searchFoods(v, controller.signal);
        if (controller.signal.aborted) return;
        setResults(res);
      } catch {
        setResults([]);
        setScanMsg("Search failed — try again");
        setTimeout(() => setScanMsg(""), 3000);
      }
      setBusy(false);
    }, 400);
  }

  function scaleToQty(q, base) {
    if (!base) return;
    const a = +q || 0;
    setFat(String(Math.round(base.fat * a)));
    setPro(String(Math.round(base.protein * a)));
    setCarb(String(Math.round(base.carbs * a)));
  }

  async function pick(f) {
    setName(f.brand ? `${f.name} (${f.brand})` : f.name);
    setResults([]);
    setShowRecents(false);
    saveRecent(f);
    let detail;
    try {
      detail = await getFoodServings(f.id);
    } catch {
      setScanMsg("Couldn't load nutrition details");
      setTimeout(() => setScanMsg(""), 3000);
      baseMacros.current = { fat: f.fat, protein: f.protein, carbs: f.carbs };
      setQty("1");
      setFat(String(Math.round(f.fat)));
      setPro(String(Math.round(f.protein)));
      setCarb(String(Math.round(f.carbs)));
      return;
    }
    if (detail?.servings?.length > 0) {
      setServings(detail.servings);
      const s = detail.servings[0];
      setSelServing(s);
      baseMacros.current = { fat: s.fat, protein: s.protein, carbs: s.carbs };
      setQty("1");
      setFat(String(Math.round(s.fat)));
      setPro(String(Math.round(s.protein)));
      setCarb(String(Math.round(s.carbs)));
    } else {
      setServings([]);
      baseMacros.current = { fat: f.fat, protein: f.protein, carbs: f.carbs };
      setSelServing(null);
      setQty("1");
      setFat(String(Math.round(f.fat)));
      setPro(String(Math.round(f.protein)));
      setCarb(String(Math.round(f.carbs)));
    }
  }

  function onServingChange(idx) {
    const s = servings[idx];
    if (!s) return;
    setSelServing(s);
    baseMacros.current = { fat: s.fat, protein: s.protein, carbs: s.carbs };
    scaleToQty(qty || "1", baseMacros.current);
  }

  function onQtyChange(q) {
    setQty(q);
    scaleToQty(q, baseMacros.current);
  }

  async function handleScan(code) {
    setScanning(false);
    setScanMsg("Looking up barcode...");
    try {
      const food = await lookupBarcode(code);
      if (food) {
        setName(food.name);
        setScanMsg("");
        baseMacros.current = { fat: food.fat, protein: food.protein, carbs: food.carbs };
        setQty("1");
        setServings([]);
        setSelServing(null);
        setFat(String(food.fat));
        setPro(String(food.protein));
        setCarb(String(food.carbs));
      } else {
        setScanMsg("Product not found. Try searching manually.");
        setTimeout(() => setScanMsg(""), 3000);
      }
    } catch {
      setScanMsg("Lookup failed. Try again.");
      setTimeout(() => setScanMsg(""), 3000);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const servDesc = selServing ? selServing.desc : "serving";
    const q = +qty || 1;
    const label = `${name.trim()} (${q}${q !== 1 ? "x " : " "}${servDesc})`;
    onAdd({ id: Date.now(), name: label, fat: +fat || 0, protein: +pro || 0, carbs: +carb || 0 });
    setName("");
    setQty("1");
    setFat("");
    setPro("");
    setCarb("");
    setResults([]);
    setServings([]);
    setSelServing(null);
    baseMacros.current = null;
  }

  return (
    <>
      <form className="fi" onSubmit={submit}>
        <div className="fi-s">
          <input
            placeholder={placeholder || "Search food..."}
            value={name}
            onChange={e => onNameChange(e.target.value)}
            onFocus={() => { if (!name.trim()) setShowRecents(true); }}
            onBlur={() => setTimeout(() => { setResults([]); setShowRecents(false); }, 200)}
          />
          {(results.length > 0 || busy) && (
            <div className="fi-drop">
              {busy && <div className="fi-load">Searching FatSecret...</div>}
              {results.map((f, i) => (
                <button key={i} type="button" onMouseDown={() => pick(f)}>
                  <strong>{f.brand ? `${f.name} (${f.brand})` : f.name}</strong>
                  <span>F:{Math.round(f.fat)} P:{Math.round(f.protein)} C:{Math.round(f.carbs)} per {f.serving}</span>
                </button>
              ))}
            </div>
          )}
          {showRecents && !busy && results.length === 0 && (() => {
            const recents = getRecents();
            return recents.length > 0 ? (
              <div className="fi-drop">
                <div className="fi-recents-head">Recent Foods</div>
                {recents.map((f, i) => (
                  <button key={i} type="button" onMouseDown={() => pick(f)}>
                    <strong>{f.brand ? `${f.name} (${f.brand})` : f.name}</strong>
                    <span>F:{Math.round(f.fat)} P:{Math.round(f.protein)} C:{Math.round(f.carbs)} per {f.serving}</span>
                  </button>
                ))}
              </div>
            ) : null;
          })()}
        </div>
        <input type="number" placeholder="Qty" value={qty} onChange={e => onQtyChange(e.target.value)} className="fi-q" min="0" step="any" />
        {servings.length > 0 ? (
          <select value={servings.indexOf(selServing)} onChange={e => onServingChange(+e.target.value)} className="fi-unit">
            {servings.map((s, i) => <option key={i} value={i}>{s.desc}</option>)}
          </select>
        ) : (
          <select className="fi-unit" disabled><option>serving</option></select>
        )}
        <input type="number" placeholder="Fat" value={fat} onChange={e => { setFat(e.target.value); baseMacros.current = null; }} className="fi-n" min="0" />
        <input type="number" placeholder="Pro" value={pro} onChange={e => { setPro(e.target.value); baseMacros.current = null; }} className="fi-n" min="0" />
        <input type="number" placeholder="Carb" value={carb} onChange={e => { setCarb(e.target.value); baseMacros.current = null; }} className="fi-n" min="0" />
        <button type="button" className="fi-scan" onClick={() => setScanning(true)} aria-label="Scan barcode" title="Scan barcode">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="11" y1="8" x2="11" y2="16"/><line x1="15" y1="8" x2="15" y2="16"/><line x1="19" y1="8" x2="19" y2="16"/></svg>
        </button>
        <button type="submit" className="fi-btn">+</button>
      </form>
      {scanMsg && <div className="scan-msg">{scanMsg}</div>}
      {scanning && <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />}
    </>
  );
}
