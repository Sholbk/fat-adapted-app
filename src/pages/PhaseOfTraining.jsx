import { SESSION_CONFIG } from "../utils/macros.js";

export default function PhaseOfTraining({ session, sType, wellness }) {
  return (
    <div className="page-content">
      <h2>Phase of Training</h2>
      <div className="phase-current">
        <div className="phase-badge" style={{ background: session.color }}>{session.label}</div>
        <p>{session.note}</p>
      </div>

      <TrainingLoadChart wellness={wellness} />

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
