export default function Ring({ value, max, color, label, size = 90 }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - 10) / 2, circ = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`${label}: ${value} of ${max}`}>
      <svg width={size} height={size} aria-hidden="true">
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
