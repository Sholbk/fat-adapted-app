export default function Entries({ items, onRemove }) {
  if (!items.length) return null;
  return (
    <div className="ent-list">
      {items.map(e => {
        const total = (e.fat || 0) + (e.protein || 0) + (e.carbs || 0) || 1;
        const fPct = Math.round((e.fat || 0) / total * 100);
        const pPct = Math.round((e.protein || 0) / total * 100);
        const cPct = 100 - fPct - pPct;
        const cal = (e.fat || 0) * 9 + (e.protein || 0) * 4 + (e.carbs || 0) * 4;
        return (
          <div key={e.id} className="ent">
            <div className="ent-info">
              <span className="ent-n">{e.name}</span>
              <div className="ent-detail">
                <span className="ent-cal">{cal} kcal</span>
                <span className="ent-m">F:{e.fat} P:{e.protein} C:{e.carbs}</span>
              </div>
              <div className="ent-bar">
                <div className="ent-bar-f" style={{ width: `${fPct}%` }} />
                <div className="ent-bar-p" style={{ width: `${pPct}%` }} />
                <div className="ent-bar-c" style={{ width: `${cPct}%` }} />
              </div>
            </div>
            <button aria-label={`Remove ${e.name}`} onClick={() => onRemove(e.id)}>&times;</button>
          </div>
        );
      })}
    </div>
  );
}
