import { useState } from "react";
import { SESSION_CONFIG, calcPhaseFromARace } from "../utils/macros.js";
import { saveSettings } from "../utils/storage.js";

const ZONE_MAP = [
  { zone: "Z1", name: "Recovery", hrRange: "< 68%", rpe: "1–2", group: "LIT", color: "#999", key: "endurance" },
  { zone: "Z2", name: "Endurance", hrRange: "68–78%", rpe: "3–4", group: "LIT", color: "#10bc10", key: "endurance" },
  { zone: "Z3a", name: "Tempo", hrRange: "78–82%", rpe: "5", group: "MIT", color: "#e8c010", key: "lowerTempo" },
  { zone: "Z3b", name: "Tempo+", hrRange: "82–88%", rpe: "6–7", group: "MIT", color: "#e87010", key: "upperTempo" },
  { zone: "Z4", name: "Threshold", hrRange: "88–93%", rpe: "8", group: "HIT", color: "#e85040", key: "threshold" },
  { zone: "Z5–Z6", name: "VO2max", hrRange: "93–120% MAP", rpe: "9", group: "HIT", color: "#cc0050", key: "vo2max" },
  { zone: "Z7", name: "Sprint", hrRange: "> 120% MAP", rpe: "10", group: "HIT", color: "#800030", key: "anaerobic" },
];

// Friel periodization phases — weeks counted back from A race
// Total ~26 weeks: Prep(3) + Base1(4) + Base2(4) + Base3(4) + Build1(4) + Build2(4) + Peak(2) + Race(1)
const FRIEL_PHASES = [
  { key: "transition", label: "Transition", color: "#999",
    desc: "Active recovery after the season ends.",
    focus: "Easy activity, mental reset, cross-training. No structured training." },
  { key: "preparation", label: "Preparation", color: "#6bb5e0",
    desc: "Early conditioning, gym strength work, and technique.",
    focus: "Foundation stabilization (bodyweight/form), skill work, easy aerobic rides." },
  { key: "base1", label: "Base 1", color: "#10bc10",
    desc: "Build aerobic capacity and muscular force.",
    focus: "Zone 2 endurance. Avoid Zone 3. Introduce strength endurance. Build volume gradually." },
  { key: "base2", label: "Base 2", color: "#2ea02e",
    desc: "Continue aerobic development with added muscular endurance.",
    focus: "Zone 2 focus with muscular endurance intervals. Strength work transitions to on-bike force." },
  { key: "base3", label: "Base 3", color: "#1a8a1a",
    desc: "Peak volume phase. Highest aerobic volume before intensity ramps up.",
    focus: "Highest weekly volume. Introduce tempo (Zone 3) sparingly. Maintain strength endurance." },
  { key: "build1", label: "Build 1", color: "#e87010",
    desc: "Introduce race-specific intensity. Volume begins to decrease.",
    focus: "Threshold and VO2max intervals. Reduce volume 10–15%. Simulate race demands." },
  { key: "build2", label: "Build 2", color: "#e85040",
    desc: "Peak intensity phase mimicking race conditions.",
    focus: "Race-pace intervals, brick workouts. Volume drops further. Sharpen race fitness." },
  { key: "peak", label: "Peak", color: "#cc0050",
    desc: "Reduced volume, high intensity to sharpen fitness.",
    focus: "Short, sharp intervals. Significant volume reduction. Maintain intensity, build freshness." },
  { key: "race", label: "Race", color: "#800030",
    desc: "Tapering, resting, and competing.",
    focus: "Minimal training. Openers only. Full recovery between efforts. Execute race plan." },
];

const PRIORITY_CONFIG = {
  A: { label: "A Race", color: "#800030", desc: "Full periodization anchor — Peak + Race taper" },
  B: { label: "B Race", color: "#e85040", desc: "Mini taper — reduced volume for 3–5 days" },
  C: { label: "C Race", color: "#e8c010", desc: "No taper — counts as a hard workout" },
};


function weeksUntil(dateStr) {
  const now = new Date();
  const target = new Date(dateStr + "T12:00");
  const diff = Math.ceil((target - now) / (7 * 24 * 60 * 60 * 1000));
  if (diff < 0) return "past";
  if (diff === 0) return "this week";
  if (diff === 1) return "1 week";
  return `${diff} weeks`;
}

function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T12:00");
  const diff = Math.round((target - now) / (24 * 60 * 60 * 1000));
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return `${diff}d`;
}

function zoneGroupLabel(group) {
  if (group === "LIT") return "Low Intensity Training";
  if (group === "MIT") return "Moderate Intensity Training";
  return "High Intensity Training";
}

export default function PhaseOfTraining({ session, sType, wellness, settings, setSettings }) {
  const activeZone = ZONE_MAP.find(z => z.key === sType) || ZONE_MAP[1];
  const races = settings?.races || [];
  const aRace = races.find(r => r.priority === "A");
  const autoPhaseKey = calcPhaseFromARace(aRace?.date);
  const currentPhase = autoPhaseKey || settings?.trainingPhase || "base1";
  const activePhase = FRIEL_PHASES.find(p => p.key === currentPhase) || FRIEL_PHASES[2];

  // Race entry form state
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [racePriority, setRacePriority] = useState("A");

  function saveRaces(nextRaces) {
    const next = { ...settings, races: nextRaces };
    setSettings(next);
    saveSettings(next);
  }

  function addRace() {
    if (!raceName.trim() || !raceDate) return;
    const nextRaces = [...races, { name: raceName.trim(), date: raceDate, priority: racePriority }]
      .sort((a, b) => a.date.localeCompare(b.date));
    saveRaces(nextRaces);
    setRaceName("");
    setRaceDate("");
  }

  function removeRace(idx) {
    saveRaces(races.filter((_, i) => i !== idx));
  }

  // Manual override if no A race is set
  function handlePhaseChange(key) {
    const next = { ...settings, trainingPhase: key };
    setSettings(next);
    saveSettings(next);
  }

  return (
    <div className="page-content">
      <h2>Training Session Focus</h2>

      {/* Current session badge */}
      <div className="phase-current">
        <div className="phase-badge" style={{ background: session.color }}>
          {session.label} — {session.zone}
        </div>
        <p className="phase-group-tag" style={{ color: activeZone.color }}>
          {activeZone.group} — {zoneGroupLabel(activeZone.group)}
        </p>
        <p>{session.note}</p>
      </div>

      <TrainingLoadChart wellness={wellness} />

      {/* Two-column: Zones (left) + Periodization (right) */}
      <div className="sf-columns">
        {/* LEFT — Athletica Zones */}
        <div className="sf-col">
          <h3>Athletica.ai Training Zones</h3>
          <div className="zone-table">
            <div className="zone-header">
              <span className="zone-col-zone">Zone</span>
              <span className="zone-col-name">Type</span>
              <span className="zone-col-hr">%HRmax</span>
              <span className="zone-col-rpe">RPE</span>
              <span className="zone-col-group">Class</span>
            </div>
            {ZONE_MAP.map(z => (
              <div key={z.zone} className={`zone-row ${z.key === sType ? "active" : ""}`}>
                <span className="zone-col-zone">
                  <span className="phase-dot" style={{ background: z.color }} />
                  {z.zone}
                </span>
                <span className="zone-col-name">{z.name}</span>
                <span className="zone-col-hr">{z.hrRange}</span>
                <span className="zone-col-rpe">{z.rpe}</span>
                <span className="zone-col-group" data-group={z.group}>{z.group}</span>
              </div>
            ))}
          </div>

          <h3>Fat-Adapted Fueling Guide</h3>
          <div className="phase-table">
            {Object.entries(SESSION_CONFIG).filter(([k]) => k !== "rest").map(([key, s]) => (
              <div key={key} className={`phase-row ${key === sType ? "active" : ""}`}>
                <span className="phase-dot" style={{ background: s.color }} />
                <span className="phase-name">{s.label} <span className="phase-zone-tag">{s.zone}</span></span>
                <span className="phase-target">{s.fuelTarget}</span>
                <span className="phase-carb">{Math.round(s.fatRatio * 100)}% fat / {Math.round((1 - s.fatRatio) * 100)}% CHO</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Training Phase */}
        <div className="sf-col">
          <h3>Training Phase</h3>
          <p className="sf-attribution">Based on Joe Friel's periodization method</p>

          {/* Current phase highlight */}
          <div className="friel-current">
            <div className="phase-badge" style={{ background: activePhase.color }}>
              {activePhase.label}
            </div>
            {aRace && <span className="friel-auto-tag">Auto — {weeksUntil(aRace.date)} to A race</span>}
            <p className="friel-desc">{activePhase.desc}</p>
            <p className="friel-focus"><strong>Focus:</strong> {activePhase.focus}</p>
          </div>

          {/* Race Calendar */}
          <h4 className="friel-section-title">Race Calendar</h4>

          {/* Race entry form */}
          <div className="race-form">
            <input
              type="text"
              placeholder="Race name"
              value={raceName}
              onChange={e => setRaceName(e.target.value)}
              className="race-input"
            />
            <input
              type="date"
              value={raceDate}
              onChange={e => setRaceDate(e.target.value)}
              className="race-input race-date"
            />
            <select value={racePriority} onChange={e => setRacePriority(e.target.value)} className="race-select">
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
            <button onClick={addRace} className="race-add-btn">Add</button>
          </div>

          {/* Priority legend */}
          <div className="race-legend">
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <span key={k} className="race-legend-item">
                <span className="race-pri-badge" data-pri={k}>{k}</span>
                {v.desc}
              </span>
            ))}
          </div>

          {/* Race list */}
          {races.length > 0 && (
            <div className="race-list">
              {races.map((r, i) => (
                <div key={i} className="race-item">
                  <span className="race-pri-badge" data-pri={r.priority}>{r.priority}</span>
                  <span className="race-item-name">{r.name}</span>
                  <span className="race-item-date">
                    {new Date(r.date + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="race-item-countdown">{daysUntil(r.date)}</span>
                  <button className="race-remove" onClick={() => removeRace(i)} title="Remove">&times;</button>
                </div>
              ))}
            </div>
          )}

          {/* Phase timeline */}
          <h4 className="friel-section-title">Periodization</h4>
          <div className="friel-phases">
            {FRIEL_PHASES.map(p => (
              <button
                key={p.key}
                className={`friel-phase-btn ${p.key === currentPhase ? "active" : ""}`}
                onClick={() => !aRace && handlePhaseChange(p.key)}
                style={aRace ? { cursor: "default", opacity: p.key === currentPhase ? 1 : 0.6 } : {}}
                title={aRace ? `Auto-calculated from A race` : `Select ${p.label}`}
              >
                <span className="friel-phase-dot" style={{ background: p.color }} />
                <span className="friel-phase-label">{p.label}</span>
              </button>
            ))}
          </div>
          {aRace && <p className="friel-auto-note">Phase auto-calculated from A race date. Remove A race to select manually.</p>}

          {/* Key Principles */}
          <div className="friel-principles">
            <h4>Key Principles</h4>
            <ul>
              <li><strong>Train to Train:</strong> In the Base phase, focus on building capacity, not racing every workout.</li>
              <li><strong>Base Intensity:</strong> Do most base training in Zone 2. Avoid Zone 3.</li>
              <li><strong>Strength Phase:</strong> Start with foundation stabilization, progress to strength endurance.</li>
              <li><strong>Volume vs. Intensity:</strong> Volume peaks in late Base, then decreases as intensity increases in Build.</li>
              <li><strong>Recovery:</strong> Planned rest within each week and at the end of 3–4 week blocks.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainingLoadChart({ wellness }) {
  const sorted = [...wellness].sort((a, b) => a.id.localeCompare(b.id)).slice(-28);
  if (sorted.length < 2) return null;

  const ctlVals = sorted.map(w => w.ctl ?? 0);
  const atlVals = sorted.map(w => w.atl ?? 0);
  const tsbVals = sorted.map((_, i) => ctlVals[i] - atlVals[i]);
  const allVals = [...ctlVals, ...atlVals, ...tsbVals];
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;
  const toY = v => 90 - ((v - minV) / range) * 80;
  const w = sorted.length * 20;

  return (
    <div className="load-chart-section">
      <h3>Training Load (28 days)</h3>
      <div className="load-chart-card">
        <div className="load-legend">
          <span><span className="load-dot" style={{ background: "#1e8ad3" }} /> Fitness (CTL)</span>
          <span><span className="load-dot" style={{ background: "#fe00a4" }} /> Fatigue (ATL)</span>
          <span><span className="load-dot" style={{ background: "#10bc10" }} /> Form (TSB)</span>
        </div>
        <svg viewBox={`0 0 ${w} 100`} preserveAspectRatio="none" className="load-svg">
          <line x1="0" y1={toY(0)} x2={w} y2={toY(0)} stroke="#ccc" strokeWidth="0.5" strokeDasharray="4" />
          <polyline fill="none" stroke="#1e8ad3" strokeWidth="1.5" points={sorted.map((_, i) => `${i * 20 + 10},${toY(ctlVals[i])}`).join(" ")} />
          <polyline fill="none" stroke="#fe00a4" strokeWidth="1.5" points={sorted.map((_, i) => `${i * 20 + 10},${toY(atlVals[i])}`).join(" ")} />
          <polyline fill="none" stroke="#10bc10" strokeWidth="1.5" points={sorted.map((_, i) => `${i * 20 + 10},${toY(tsbVals[i])}`).join(" ")} />
        </svg>
        <div className="load-dates">
          {sorted.filter((_, i) => i % 7 === 0).map(w => (
            <span key={w.id}>{new Date(w.id + "T12:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
