import { getWater, setWater } from "../utils/storage.js";

export default function HydrationCard({ date, settings, refresh }) {
  const waterOz = getWater(date);
  const waterTarget = settings.waterTarget || 100;
  const pct = Math.min((waterOz / waterTarget) * 100, 100);
  return (
    <>
      <div className="water-display">
        <span className="water-amount">{waterOz}</span>
        <span className="water-unit">/ {waterTarget} oz</span>
      </div>
      <div className="mrow-bar" style={{ marginBottom: "0.5rem" }}>
        <div style={{ width: `${pct}%`, background: waterOz >= waterTarget ? "#10bc10" : "#1e8ad3" }} />
      </div>
      <div className="water-btns">
        {[8, 12, 16, 24].map(oz => (
          <button key={oz} className="water-btn" onClick={() => { setWater(date, waterOz + oz); refresh(); }}>+{oz}oz</button>
        ))}
        <button className="water-btn water-undo" onClick={() => { setWater(date, Math.max(0, waterOz - 8)); refresh(); }}>Undo</button>
      </div>
    </>
  );
}
