import { SESSION_CONFIG } from "../utils/macros.js";

const ZONE_MAP = [
  { zone: "Z1", name: "Recovery", hrRange: "< 68%", rpe: "1–2", group: "LIT", color: "#999", key: "endurance" },
  { zone: "Z2", name: "Endurance", hrRange: "68–78%", rpe: "3–4", group: "LIT", color: "#10bc10", key: "endurance" },
  { zone: "Z3a", name: "Tempo", hrRange: "78–82%", rpe: "5", group: "MIT", color: "#e8c010", key: "lowerTempo" },
  { zone: "Z3b", name: "Tempo+", hrRange: "82–88%", rpe: "6–7", group: "MIT", color: "#e87010", key: "upperTempo" },
  { zone: "Z4", name: "Threshold", hrRange: "88–93%", rpe: "8", group: "HIT", color: "#e85040", key: "threshold" },
  { zone: "Z5–Z6", name: "VO2max", hrRange: "93–120% MAP", rpe: "9", group: "HIT", color: "#cc0050", key: "vo2max" },
  { zone: "Z7", name: "Sprint", hrRange: "> 120% MAP", rpe: "10", group: "HIT", color: "#800030", key: "anaerobic" },
];

function zoneGroupLabel(group) {
  if (group === "LIT") return "Low Intensity Training";
  if (group === "MIT") return "Moderate Intensity Training";
  return "High Intensity Training";
}

export default function PhaseOfTraining({ session, sType, wellness }) {
  const activeZone = ZONE_MAP.find(z => z.key === sType) || ZONE_MAP[1];

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

      {/* 7-Zone Table */}
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

      {/* Fat-Adapted Fueling Guide */}
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
