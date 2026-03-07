export default function Entries({ items, onRemove }) {
  if (!items.length) return null;
  return (
    <div className="ent-list">
      {items.map(e => (
        <div key={e.id} className="ent">
          <span className="ent-n">{e.name}</span>
          <span className="ent-m">F:{e.fat} P:{e.protein} C:{e.carbs}</span>
          <button aria-label={`Remove ${e.name}`} onClick={() => onRemove(e.id)}>&times;</button>
        </div>
      ))}
    </div>
  );
}
