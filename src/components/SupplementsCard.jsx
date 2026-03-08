import { getSupps, setSupps, COMMON_SUPPS } from "../utils/storage.js";

export default function SupplementsCard({ date, refresh }) {
  const supps = getSupps(date);
  return (
    <>
      <div className="supp-tags">
        {COMMON_SUPPS.map(s => {
          const taken = supps.includes(s);
          return (
            <button key={s} className={`supp-tag${taken ? " taken" : ""}`} onClick={() => {
              setSupps(date, taken ? supps.filter(x => x !== s) : [...supps, s]);
              refresh();
            }}>{taken ? "\u2713 " : ""}{s}</button>
          );
        })}
      </div>
      {supps.length > 0 && <div className="supp-count">{supps.length} supplement{supps.length !== 1 ? "s" : ""} taken today</div>}
    </>
  );
}
