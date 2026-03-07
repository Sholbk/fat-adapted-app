export default function MacroRow({ label, consumed, target, color }) {
  const pct = target > 0 ? Math.min(consumed / target * 100, 100) : 0;
  const left = target - consumed;
  return (
    <div className="mrow">
      <div className="mrow-top">
        <span className="mrow-dot" style={{ background: color }} />
        <span className="mrow-label">{label}</span>
        <span className="mrow-val">{consumed}g / {target}g</span>
      </div>
      <div className="mrow-bar">
        <div style={{ width: `${pct}%`, background: consumed > target ? "#fe00a4" : color }} />
      </div>
      <span className="mrow-left">{left >= 0 ? `${left}g left` : `${Math.abs(left)}g over`}</span>
    </div>
  );
}
