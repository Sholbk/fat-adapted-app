import { fmt, today } from "../utils/parsing.js";
import { MEALS, getLog, getTLog, sum } from "../utils/storage.js";
import { getSessionTypeFromWorkouts } from "../utils/classification.js";
import { calcMacros } from "../utils/macros.js";

function getWeekDates(currentDate) {
  const d = new Date(currentDate + "T00:00:00");
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return fmt(dd);
  });
}

function getDayTotals(date) {
  const mealEntries = MEALS.flatMap(m => getLog(date, m));
  const trainEntries = getTLog(date);
  return sum([...mealEntries, ...trainEntries]);
}

function exportCSV(weekDates, weekData, macroTargets) {
  const header = "Date,Calories Target,Calories Consumed,Fat Target (g),Fat Consumed (g),Protein Target (g),Protein Consumed (g),Carbs Target (g),Carbs Consumed (g)";
  const rows = weekDates.map((d, i) => {
    const t = weekData[i];
    const m = macroTargets[i];
    return `${d},${m.cal},${t.cal},${m.fat},${t.fat},${m.protein},${t.protein},${m.carbs},${t.carbs}`;
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fuelflow-week-${weekDates[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklySummary({ date, setDate, setPage, planned, wellness, settings }) {
  const W = settings.weight;
  const calAdj = settings.goalWeight < W ? -500 : settings.goalWeight > W ? 500 : 0;
  const weekDates = getWeekDates(date);
  const weekData = weekDates.map(d => getDayTotals(d));
  const weekTargets = weekDates.map(d => {
    const dWorkouts = planned.filter(w => w.date === d);
    const dWd = wellness.find(w => w.id === d) || {};
    const dLoad = dWd.atlLoad ?? dWd.ctlLoad ?? 0;
    const dSType = getSessionTypeFromWorkouts(dWorkouts, dLoad);
    return calcMacros(dSType, W, settings.height, settings.age, calAdj, settings.gender);
  });

  return (
    <div className="page-content" style={{ maxWidth: 800 }}>
      <div className="weekly-header">
        <h2>Weekly Summary</h2>
        <button className="export-btn" onClick={() => exportCSV(weekDates, weekData, weekTargets)}>Export CSV</button>
      </div>
      <p className="page-sub">Week of {new Date(weekDates[0] + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date(weekDates[6] + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
      <div className="weekly-grid">
        <div className="weekly-row weekly-row-header">
          <span className="weekly-day">Day</span>
          <span>Calories</span>
          <span>Fat</span>
          <span>Protein</span>
          <span>Carbs</span>
        </div>
        {weekDates.map((d, i) => {
          const t = weekData[i];
          const m = weekTargets[i];
          const isToday = d === today();
          return (
            <div key={d} className={`weekly-row${isToday ? " weekly-today" : ""}`} onClick={() => { setDate(d); setPage("log"); }} style={{ cursor: "pointer" }}>
              <span className="weekly-day">
                <strong>{DAY_NAMES[i]}</strong>
                <span className="weekly-date-num">{new Date(d + "T12:00").getDate()}</span>
              </span>
              <span className="weekly-cell">
                <div className="weekly-bar-bg"><div className="weekly-bar" style={{ width: `${Math.min((t.cal / m.cal) * 100, 100)}%`, background: t.cal > m.cal ? "#fe00a4" : "#1e8ad3" }} /></div>
                <span className="weekly-nums">{t.cal} / {m.cal}</span>
              </span>
              <span className="weekly-cell">
                <div className="weekly-bar-bg"><div className="weekly-bar" style={{ width: `${Math.min((t.fat / m.fat) * 100, 100)}%`, background: "#fe00a4" }} /></div>
                <span className="weekly-nums">{t.fat}g / {m.fat}g</span>
              </span>
              <span className="weekly-cell">
                <div className="weekly-bar-bg"><div className="weekly-bar" style={{ width: `${Math.min((t.protein / m.protein) * 100, 100)}%`, background: "#043bb1" }} /></div>
                <span className="weekly-nums">{t.protein}g / {m.protein}g</span>
              </span>
              <span className="weekly-cell">
                <div className="weekly-bar-bg"><div className="weekly-bar" style={{ width: `${Math.min((t.carbs / m.carbs) * 100, 100)}%`, background: "#10bc10" }} /></div>
                <span className="weekly-nums">{t.carbs}g / {m.carbs}g</span>
              </span>
            </div>
          );
        })}
        <div className="weekly-row weekly-row-avg">
          <span className="weekly-day"><strong>Avg</strong></span>
          <span className="weekly-nums">{Math.round(weekData.reduce((s, d) => s + d.cal, 0) / 7)} kcal</span>
          <span className="weekly-nums">{Math.round(weekData.reduce((s, d) => s + d.fat, 0) / 7)}g</span>
          <span className="weekly-nums">{Math.round(weekData.reduce((s, d) => s + d.protein, 0) / 7)}g</span>
          <span className="weekly-nums">{Math.round(weekData.reduce((s, d) => s + d.carbs, 0) / 7)}g</span>
        </div>
      </div>
    </div>
  );
}
