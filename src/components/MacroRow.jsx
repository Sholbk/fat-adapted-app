export default function MacroRow({ label, consumed, target, color }) {
  const pct = target > 0 ? Math.min(consumed / target * 100, 100) : 0;
  const rawPct = target > 0 ? Math.round(consumed / target * 100) : 0;
  const left = target - consumed;
  const over = consumed > target;
  return (
    <div className="mrow">
      <div className="mrow-top">
        <span className="mrow-dot" style={{ background: color }} />
        <span className="mrow-label">{label}</span>
        <span className={`mrow-pct${over ? " mrow-over" : rawPct >= 80 ? " mrow-near" : ""}`}>{rawPct}%</span>
        <span className="mrow-val">{consumed}g / {target}g</span>
      </div>
      <div className="mrow-bar">
        <div style={{ width: `${pct}%`, background: over ? "#fe00a4" : rawPct >= 80 ? "#10bc10" : color }} />
      </div>
      <span className={`mrow-left${over ? " mrow-left-over" : ""}`}>{left >= 0 ? `${left}g left` : `${Math.abs(left)}g over`}</span>
    </div>
  );
}
