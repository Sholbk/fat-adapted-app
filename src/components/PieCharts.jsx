export default function PieCharts({ all, macros }) {
  const fatCal = all.fat * 9, proCal = all.protein * 4, carbCal = all.carbs * 4;
  const total = fatCal + proCal + carbCal || 1;
  const fatPct = Math.round(fatCal / total * 100);
  const proPct = Math.round(proCal / total * 100);
  const carbPct = 100 - fatPct - proPct;
  const tFatCal = macros.fat * 9, tProCal = macros.protein * 4, tCarbCal = macros.carbs * 4;
  const tTotal = tFatCal + tProCal + tCarbCal || 1;
  const tFatPct = Math.round(tFatCal / tTotal * 100);
  const tProPct = Math.round(tProCal / tTotal * 100);
  const tCarbPct = 100 - tFatPct - tProPct;

  function pieSlices(slices) {
    let angle = 0;
    return slices.map(({ pct, color }) => {
      const start = angle;
      angle += pct / 100 * 360;
      const end = angle;
      const r = 40, cx = 50, cy = 50;
      const rad = a => (a - 90) * Math.PI / 180;
      const x1 = cx + r * Math.cos(rad(start)), y1 = cy + r * Math.sin(rad(start));
      const x2 = cx + r * Math.cos(rad(end)), y2 = cy + r * Math.sin(rad(end));
      const large = pct > 50 ? 1 : 0;
      if (pct >= 100) return <circle key={color} cx={cx} cy={cy} r={r} fill={color} />;
      if (pct <= 0) return null;
      return <path key={color} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={color} />;
    });
  }

  return (
    <div className="pie-section">
      <div className="pie-group">
        <span className="pie-label">Current</span>
        <svg viewBox="0 0 100 100" className="pie-svg" role="img" aria-label={`Current macros: ${fatPct}% fat, ${proPct}% protein, ${carbPct}% carbs`}>{pieSlices([{ pct: fatPct, color: "#fe00a4" }, { pct: proPct, color: "#043bb1" }, { pct: carbPct, color: "#10bc10" }])}</svg>
        <div className="pie-legend"><span>F:{fatPct}%</span><span>P:{proPct}%</span><span>C:{carbPct}%</span></div>
      </div>
      <div className="pie-group">
        <span className="pie-label">Target</span>
        <svg viewBox="0 0 100 100" className="pie-svg" role="img" aria-label={`Target macros: ${tFatPct}% fat, ${tProPct}% protein, ${tCarbPct}% carbs`}>{pieSlices([{ pct: tFatPct, color: "#fe00a4" }, { pct: tProPct, color: "#043bb1" }, { pct: tCarbPct, color: "#10bc10" }])}</svg>
        <div className="pie-legend"><span>F:{tFatPct}%</span><span>P:{tProPct}%</span><span>C:{tCarbPct}%</span></div>
      </div>
    </div>
  );
}
