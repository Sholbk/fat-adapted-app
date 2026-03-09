import { SESSION_CONFIG } from "../utils/macros.js";
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

const FRIEL_PHASES = [
  { key: "transition", label: "Transition", weeks: "1–4 weeks", color: "#999",
    desc: "Active recovery after the season ends.",
    focus: "Easy activity, mental reset, cross-training. No structured training." },
  { key: "preparation", label: "Preparation", weeks: "2–4 weeks", color: "#6bb5e0",
    desc: "Early conditioning, gym strength work, and technique.",
    focus: "Foundation stabilization (bodyweight/form), skill work, easy aerobic rides." },
  { key: "base1", label: "Base 1", weeks: "3–4 weeks", color: "#10bc10",
    desc: "Build aerobic capacity and muscular force.",
    focus: "Zone 2 endurance. Avoid Zone 3. Introduce strength endurance. Build volume gradually." },
  { key: "base2", label: "Base 2", weeks: "3–4 weeks", color: "#2ea02e",
    desc: "Continue aerobic development with added muscular endurance.",
    focus: "Zone 2 focus with muscular endurance intervals. Strength work transitions to on-bike force." },
  { key: "base3", label: "Base 3", weeks: "3–4 weeks", color: "#1a8a1a",
    desc: "Peak volume phase. Highest aerobic volume before intensity ramps up.",
    focus: "Highest weekly volume. Introduce tempo (Zone 3) sparingly. Maintain strength endurance." },
  { key: "build1", label: "Build 1", weeks: "3–4 weeks", color: "#e87010",
    desc: "Introduce race-specific intensity. Volume begins to decrease.",
    focus: "Threshold and VO2max intervals. Reduce volume 10–15%. Simulate race demands." },
  { key: "build2", label: "Build 2", weeks: "3–4 weeks", color: "#e85040",
    desc: "Peak intensity phase mimicking race conditions.",
    focus: "Race-pace intervals, brick workouts. Volume drops further. Sharpen race fitness." },
  { key: "peak", label: "Peak", weeks: "1–2 weeks", color: "#cc0050",
    desc: "Reduced volume, high intensity to sharpen fitness.",
    focus: "Short, sharp intervals. Significant volume reduction. Maintain intensity, build freshness." },
  { key: "race", label: "Race", weeks: "1–2 weeks", color: "#800030",
    desc: "Tapering, resting, and competing.",
    focus: "Minimal training. Openers only. Full recovery between efforts. Execute race plan." },
];

function zoneGroupLabel(group) {
  if (group === "LIT") return "Low Intensity Training";
  if (group === "MIT") return "Moderate Intensity Training";
  return "High Intensity Training";
}

export default function PhaseOfTraining({ session, sType, wellness, settings, setSettings }) {
  const activeZone = ZONE_MAP.find(z => z.key === sType) || ZONE_MAP[1];
  const currentPhase = settings?.trainingPhase || "base1";
  const activePhase = FRIEL_PHASES.find(p => p.key === currentPhase) || FRIEL_PHASES[2];

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
                <span className="phase-target">{s.fuel.during}</span>
                <span className="phase-carb">{Math.round(s.fatRatio * 100)}% fat / {Math.round((1 - s.fatRatio) * 100)}% CHO</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Friel Periodization */}
        <div className="sf-col">
          <h3>Phase of Training</h3>
          <p className="sf-attribution">Based on Joe Friel's periodization method</p>

          {/* Current phase highlight */}
          <div className="friel-current">
            <div className="phase-badge" style={{ background: activePhase.color }}>
              {activePhase.label}
            </div>
            <span className="friel-weeks">{activePhase.weeks}</span>
            <p className="friel-desc">{activePhase.desc}</p>
            <p className="friel-focus"><strong>Focus:</strong> {activePhase.focus}</p>
          </div>

          {/* Phase selector */}
          <div className="friel-phases">
            {FRIEL_PHASES.map(p => (
              <button
                key={p.key}
                className={`friel-phase-btn ${p.key === currentPhase ? "active" : ""}`}
                onClick={() => handlePhaseChange(p.key)}
              >
                <span className="friel-phase-dot" style={{ background: p.color }} />
                <span className="friel-phase-label">{p.label}</span>
                <span className="friel-phase-weeks">{p.weeks}</span>
              </button>
            ))}
          </div>

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
