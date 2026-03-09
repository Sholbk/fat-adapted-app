import { fmt, today } from "../utils/parsing.js";
import { MEALS, getLog, getTLog, sum, getMood } from "../utils/storage.js";
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
  a.download = `fastfuel-week-${weekDates[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MOOD_LABELS = { great: "Great", good: "Good", ok: "OK", bad: "Bad", awful: "Awful" };

function pct(consumed, target) {
  if (!target || target === 0) return 0;
  return Math.round((consumed / target) * 100);
}

function complianceColor(p) {
  if (p >= 85 && p <= 115) return "#10bc10";
  if (p >= 70 && p <= 130) return "#e8c010";
  return "#e85040";
}

function PieChart({ fat, protein, carbs, size = 80 }) {
  const total = fat + protein + carbs || 1;
  const fPct = fat / total, pPct = protein / total, cPct = carbs / total;
  const r = size / 2 - 4, cx = size / 2, cy = size / 2;

  function arc(startPct, endPct) {
    const s = startPct * Math.PI * 2 - Math.PI / 2;
    const e = endPct * Math.PI * 2 - Math.PI / 2;
    const large = endPct - startPct > 0.5 ? 1 : 0;
    return `M${cx + r * Math.cos(s)},${cy + r * Math.sin(s)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(e)},${cy + r * Math.sin(e)} L${cx},${cy}Z`;
  }

  if (total <= 0) return <svg width={size} height={size}><circle cx={cx} cy={cy} r={r} fill="#ddd" /></svg>;

  return (
    <svg width={size} height={size}>
      {fPct > 0 && <path d={arc(0, fPct)} fill="#fe00a4" />}
      {pPct > 0 && <path d={arc(fPct, fPct + pPct)} fill="#043bb1" />}
      {cPct > 0 && <path d={arc(fPct + pPct, fPct + pPct + cPct)} fill="#10bc10" />}
    </svg>
  );
}

export default function WeeklySummary({ date, setDate, setPage, planned, wellness, settings }) {
  const W = settings.weight;
  const calAdj = 0;
  const weekDates = getWeekDates(date);
  const weekData = weekDates.map(d => getDayTotals(d));
  const weekTargets = weekDates.map(d => {
    const dWorkouts = planned.filter(w => w.date === d);
    const dWd = wellness.find(w => w.id === d) || {};
    const dLoad = dWd.atlLoad ?? dWd.ctlLoad ?? 0;
    const dSType = getSessionTypeFromWorkouts(dWorkouts, dLoad);
    return calcMacros(dSType, W, settings.height, settings.age, calAdj, settings.gender);
  });

  // Averages
  const avgConsumed = {
    cal: Math.round(weekData.reduce((s, d) => s + d.cal, 0) / 7),
    fat: Math.round(weekData.reduce((s, d) => s + d.fat, 0) / 7),
    protein: Math.round(weekData.reduce((s, d) => s + d.protein, 0) / 7),
    carbs: Math.round(weekData.reduce((s, d) => s + d.carbs, 0) / 7),
  };
  const avgTarget = {
    cal: Math.round(weekTargets.reduce((s, d) => s + d.cal, 0) / 7),
    fat: Math.round(weekTargets.reduce((s, d) => s + d.fat, 0) / 7),
    protein: Math.round(weekTargets.reduce((s, d) => s + d.protein, 0) / 7),
    carbs: Math.round(weekTargets.reduce((s, d) => s + d.carbs, 0) / 7),
  };

  // Compliance per day (cal)
  const dailyCompliance = weekDates.map((_, i) => {
    const t = weekData[i], m = weekTargets[i];
    if (t.cal === 0 && m.cal === 0) return null; // no data
    return pct(t.cal, m.cal);
  });
  const daysWithData = dailyCompliance.filter(c => c !== null);
  const avgCompliance = daysWithData.length > 0 ? Math.round(daysWithData.reduce((s, c) => s + c, 0) / daysWithData.length) : 0;

  // Mood
  const weekMoods = weekDates.map(d => getMood(d));
  const moodCounts = {};
  weekMoods.filter(Boolean).forEach(m => { moodCounts[m] = (moodCounts[m] || 0) + 1; });
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const moodLogged = weekMoods.filter(Boolean).length;

  // Sleep (from wellness/Intervals.icu)
  const weekWellness = weekDates.map(d => wellness.find(w => w.id === d) || {});
  const sleepDays = weekWellness.filter(w => w.sleepSecs > 0);
  const avgSleepSecs = sleepDays.length > 0 ? Math.round(sleepDays.reduce((s, w) => s + w.sleepSecs, 0) / sleepDays.length) : 0;
  const avgSleepScore = sleepDays.filter(w => w.sleepScore > 0).length > 0
    ? Math.round(sleepDays.filter(w => w.sleepScore > 0).reduce((s, w) => s + w.sleepScore, 0) / sleepDays.filter(w => w.sleepScore > 0).length)
    : 0;

  // Training compliance (planned vs completed)
  const plannedCount = weekDates.reduce((s, d) => s + planned.filter(w => w.date === d).length, 0);
  const completedCount = weekDates.reduce((s, d) => {
    const dayPlanned = planned.filter(w => w.date === d);
    return s + dayPlanned.filter(w => w.status === "done" || w.status === "completed").length;
  }, 0);
  // Also count from wellness data (activities)
  const activityDays = weekWellness.filter(w => (w.atlLoad ?? 0) > 0).length;
  const trainingPct = plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : (activityDays > 0 ? Math.round((activityDays / 7) * 100) : 0);

  return (
    <div className="page-content" style={{ maxWidth: 900 }}>
      <div className="weekly-header">
        <h2>Weekly Summary</h2>
        <button className="export-btn" onClick={() => exportCSV(weekDates, weekData, weekTargets)}>Export CSV</button>
      </div>
      <p className="page-sub">Week of {new Date(weekDates[0] + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date(weekDates[6] + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>

      {/* Summary Cards Row */}
      <div className="ws-cards">
        {/* Macro Compliance */}
        <div className="ws-card">
          <h3>Nutrition Compliance</h3>
          <div className="ws-compliance-ring">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#e8e8e8" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={complianceColor(avgCompliance)} strokeWidth="6"
                strokeDasharray={`${(Math.min(avgCompliance, 100) / 100) * 213.6} 213.6`}
                strokeLinecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <span className="ws-compliance-pct" style={{ color: complianceColor(avgCompliance) }}>{avgCompliance}%</span>
          </div>
          <div className="ws-compliance-detail">
            <div><span style={{ color: "#fe00a4" }}>Fat</span> {pct(avgConsumed.fat, avgTarget.fat)}%</div>
            <div><span style={{ color: "#043bb1" }}>Pro</span> {pct(avgConsumed.protein, avgTarget.protein)}%</div>
            <div><span style={{ color: "#10bc10" }}>Carbs</span> {pct(avgConsumed.carbs, avgTarget.carbs)}%</div>
          </div>
        </div>

        {/* Average Macro Pie */}
        <div className="ws-card">
          <h3>Avg Macro Split</h3>
          <div className="ws-pie-wrap">
            <PieChart fat={avgConsumed.fat * 9} protein={avgConsumed.protein * 4} carbs={avgConsumed.carbs * 4} size={90} />
          </div>
          <div className="ws-pie-legend">
            <span><span className="ws-dot" style={{ background: "#fe00a4" }} /> Fat {avgConsumed.fat}g</span>
            <span><span className="ws-dot" style={{ background: "#043bb1" }} /> Pro {avgConsumed.protein}g</span>
            <span><span className="ws-dot" style={{ background: "#10bc10" }} /> Carbs {avgConsumed.carbs}g</span>
          </div>
          <div className="ws-avg-cal">{avgConsumed.cal} kcal/day avg</div>
        </div>

        {/* Mood */}
        <div className="ws-card">
          <h3>Mood</h3>
          {moodLogged > 0 ? (
            <>
              <div className="ws-mood-top">{topMood ? MOOD_LABELS[topMood[0]] || topMood[0] : "—"}</div>
              <div className="ws-mood-sub">{moodLogged}/7 days logged</div>
              <div className="ws-mood-bars">
                {Object.entries(MOOD_LABELS).map(([k, label]) => (
                  <div key={k} className="ws-mood-row">
                    <span className="ws-mood-label">{label}</span>
                    <div className="ws-mood-bar-bg">
                      <div className="ws-mood-bar" style={{ width: `${((moodCounts[k] || 0) / 7) * 100}%` }} />
                    </div>
                    <span className="ws-mood-count">{moodCounts[k] || 0}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="ws-empty">No mood data logged this week</div>
          )}
        </div>

        {/* Sleep */}
        <div className="ws-card">
          <h3>Sleep</h3>
          {avgSleepSecs > 0 ? (
            <>
              <div className="ws-sleep-big">{Math.floor(avgSleepSecs / 3600)}h {Math.round((avgSleepSecs % 3600) / 60)}m</div>
              <div className="ws-sleep-sub">avg per night ({sleepDays.length}/7 days)</div>
              {avgSleepScore > 0 && <div className="ws-sleep-score">Sleep Score: <strong>{avgSleepScore}</strong></div>}
            </>
          ) : (
            <div className="ws-empty">No sleep data this week</div>
          )}
        </div>

        {/* Training Compliance */}
        <div className="ws-card">
          <h3>Training</h3>
          <div className="ws-compliance-ring">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#e8e8e8" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={complianceColor(trainingPct)} strokeWidth="6"
                strokeDasharray={`${(Math.min(trainingPct, 100) / 100) * 213.6} 213.6`}
                strokeLinecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <span className="ws-compliance-pct" style={{ color: complianceColor(trainingPct) }}>{trainingPct}%</span>
          </div>
          <div className="ws-train-detail">
            {plannedCount > 0 ? (
              <span>{completedCount}/{plannedCount} sessions completed</span>
            ) : (
              <span>{activityDays}/7 active days</span>
            )}
          </div>
        </div>
      </div>

      {/* Daily breakdown table */}
      <h3>Daily Breakdown</h3>
      <div className="weekly-grid">
        <div className="weekly-row weekly-row-header">
          <span className="weekly-day">Day</span>
          <span>Calories</span>
          <span>Fat</span>
          <span>Protein</span>
          <span>Carbs</span>
          <span>Compliance</span>
        </div>
        {weekDates.map((d, i) => {
          const t = weekData[i];
          const m = weekTargets[i];
          const isToday = d === today();
          const comp = pct(t.cal, m.cal);
          return (
            <div key={d} className={`weekly-row${isToday ? " weekly-today" : ""}`} onClick={() => { setDate(d); setPage("log"); }} style={{ cursor: "pointer" }}>
              <span className="weekly-day">
                <strong>{DAY_NAMES[i]}</strong>
                <span className="weekly-date-num">{new Date(d + "T12:00").getDate()}</span>
              </span>
              <span className="weekly-nums">{t.cal} / {m.cal}</span>
              <span className="weekly-nums">{t.fat}g / {m.fat}g</span>
              <span className="weekly-nums">{t.protein}g / {m.protein}g</span>
              <span className="weekly-nums">{t.carbs}g / {m.carbs}g</span>
              <span className="weekly-nums" style={{ color: complianceColor(comp), fontWeight: 700 }}>{t.cal > 0 ? `${comp}%` : "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
