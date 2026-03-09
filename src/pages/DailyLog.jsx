import { useState } from "react";
import { SESSION_CONFIG } from "../utils/macros.js";
import { classifyWorkout, classifyByIntensity } from "../utils/classification.js";
import { MEALS, getLog, setLog, getMood, setMood, getNotes, setNotes, sum } from "../utils/storage.js";
import { fmt } from "../utils/parsing.js";
import FoodInput from "../components/FoodInput.jsx";
import Entries from "../components/Entries.jsx";
import Ring from "../components/Ring.jsx";
import MacroRow from "../components/MacroRow.jsx";
import WorkoutGlossary from "../components/WorkoutGlossary.jsx";
import HydrationCard from "../components/HydrationCard.jsx";
import SupplementsCard from "../components/SupplementsCard.jsx";
import PieCharts from "../components/PieCharts.jsx";
import AICoachCard from "../components/AICoachCard.jsx";

const ZONE_LABELS = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6", "Z7"];
const ZONE_COLORS = ["#1e8ad3", "#10bc10", "#90c010", "#e8c010", "#e87010", "#fe00a4", "#cc0050"];

export default function DailyLog({ date, macros, session, sType, fuelRec, fuelRecTotal, dayWorkouts, wellness, planned, mealData, mealTotals, trainEntries, trainTotals, all, addMeal, rmMeal, addTrain, rmTrain, refresh, showToast, settings }) {
  const wd = wellness.find(w => w.id === date) || {};
const load = wd.atlLoad ?? wd.ctlLoad ?? 0;

  return (
    <>
      <div className="cards-row">
        <div className="card">
          <h2>Non-Training Fuel</h2>
          <MacroRow label="Fat" consumed={mealTotals.fat} target={macros.fat} color="#fe00a4" />
          <MacroRow label="Protein" consumed={mealTotals.protein} target={macros.protein} color="#043bb1" />
          <MacroRow label="Carbs" consumed={mealTotals.carbs} target={macros.carbs} color="#10bc10" />
          <div className="card-cal"><span>{mealTotals.cal}</span> / {macros.cal} kcal</div>
        </div>

        <div className="card">
          <h2>Training Fuel</h2>
          <div className="fuel-recs">
            <div className="fuel-r"><span className="fuel-ph">4–24h Pre</span><span>{session.fuel.pre24h}</span></div>
            <div className="fuel-r"><span className="fuel-ph">&gt;1h Pre</span><span>{session.fuel.pre1h}</span></div>
            <div className="fuel-r"><span className="fuel-ph">During (early)</span><span>{session.fuel.duringEarly}</span></div>
            <div className="fuel-r"><span className="fuel-ph">During (later)</span><span>{session.fuel.duringLater}</span></div>
            <div className="fuel-r"><span className="fuel-ph">Post</span><span>{session.fuel.post}</span></div>
          </div>
          <div className="fuel-rec-macros">
            <div className="fuel-rec-title">Recommended Training Fuel</div>
            <div className="fuel-rec-table">
              <div className="fuel-rec-row fuel-rec-header"><span></span><span>Carbs</span><span>Protein</span><span>Fat</span></div>
              <div className="fuel-rec-row"><span className="fuel-ph">Pre</span><span>{fuelRec.pre.carbs}g</span><span>{fuelRec.pre.protein}g</span><span>{fuelRec.pre.fat}g</span></div>
              <div className="fuel-rec-row"><span className="fuel-ph">During</span><span>{fuelRec.during.carbs}g</span><span>{fuelRec.during.protein}g</span><span>{fuelRec.during.fat}g</span></div>
              <div className="fuel-rec-row"><span className="fuel-ph">Post</span><span>{fuelRec.post.carbs}g</span><span>{fuelRec.post.protein}g</span><span>{fuelRec.post.fat}g</span></div>
              <div className="fuel-rec-row fuel-rec-total"><span>Total</span><span>{fuelRecTotal.carbs}g</span><span>{fuelRecTotal.protein}g</span><span>{fuelRecTotal.fat}g</span></div>
            </div>
            <div className="fuel-rec-cal">{fuelRecTotal.cal} kcal recommended</div>
          </div>
          {trainEntries.length > 0 && <>
            <div className="fuel-logged-head">Logged</div>
            <Entries items={trainEntries} onRemove={rmTrain} />
            <div className="fuel-sum">{trainTotals.cal} kcal — F:{trainTotals.fat}g P:{trainTotals.protein}g C:{trainTotals.carbs}g</div>
          </>}
          <FoodInput onAdd={addTrain} placeholder="Log training fuel..." />
        </div>

        <div className="card">
          <h2>Training Sessions</h2>
          {dayWorkouts.length > 0 ? dayWorkouts.map((w, i) => {
            const wName = w.summary || w.name || "";
            const wType = w.icu_intensity ? classifyByIntensity(w.icu_intensity) : classifyWorkout(wName);
            const sessionCfg = SESSION_CONFIG[wType];
            const zoneTimes = w.workout_doc?.zoneTimes;
            const totalZoneSecs = zoneTimes ? zoneTimes.reduce((s, z) => s + (z.secs || 0), 0) : 0;
            const isStravaOnly = w.source === "strava";
            return (
              <div key={i} className={`wo wo-${w.status || "planned"}`}>
                <div className="wo-top">
                  <span className="wo-name">{wName}{isStravaOnly && w.startTime ? ` at ${w.startTime}` : ""}</span>
                  {w.status === "completed" && <span className="wo-status-badge wo-status-done">Completed</span>}
                  {w.status === "unplanned" && <span className="wo-status-badge wo-status-extra">Unplanned</span>}
                  {w.status === "planned" && <span className="wo-status-badge wo-status-plan">Planned</span>}
                  {w.duration && <span className="wo-dur">{w.duration}</span>}
                </div>
                {!isStravaOnly && <>
                  {w.type && <span className="wo-type">{w.type}</span>}
                  <div className="wo-desc">{(w.description || "").split("\n").filter(l => l.trim() && !l.startsWith("Duration:")).slice(0, 4).join("\n")}</div>
                  <span className="wo-badge" style={{ color: sessionCfg.color }}>{sessionCfg.label}</span>
                  {w.source === "intervals" && (
                    <div className="wo-meta">
                      {w.icu_training_load != null && <span className="wo-meta-item">Load: <strong>{Math.round(w.icu_training_load)}</strong></span>}
                      {w.icu_intensity != null && <span className="wo-meta-item">Intensity: <strong>{Math.round(w.icu_intensity)}%</strong></span>}
                    </div>
                  )}
                  {zoneTimes && totalZoneSecs > 0 && (
                    <div className="wo-zones">
                      <div className="wo-zones-bar">
                        {zoneTimes.map((z, zi) => {
                          const pct = (z.secs / totalZoneSecs) * 100;
                          if (pct < 0.5) return null;
                          return <div key={zi} style={{ width: `${pct}%`, background: ZONE_COLORS[zi] }} title={`${ZONE_LABELS[zi]}: ${Math.round(z.secs / 60)}m`} />;
                        })}
                      </div>
                      <div className="wo-zones-labels">
                        {zoneTimes.map((z, zi) => z.secs > 0 ? (
                          <span key={zi} style={{ color: ZONE_COLORS[zi] }}>{ZONE_LABELS[zi]}: {Math.round(z.secs / 60)}m</span>
                        ) : null)}
                      </div>
                    </div>
                  )}
                </>}
                {isStravaOnly && <span className="wo-strava-note">Recorded via Strava — details restricted by Intervals.icu API</span>}
              </div>
            );
          }) : <p className="wo-empty">{load > 0 ? "Activity recorded — no planned workout" : "Rest day"}</p>}
          {(load > 0 || wd.ctl != null) && (
            <div className="wo-stats">
              {load > 0 && <div><span>Load</span><strong>{load}</strong></div>}
              {wd.ctl != null && <div><span>Fitness</span><strong>{wd.ctl.toFixed(1)}</strong></div>}
              {wd.atl != null && <div><span>Fatigue</span><strong>{wd.atl.toFixed(1)}</strong></div>}
            </div>
          )}
          <WorkoutGlossary />
        </div>
      </div>

      <AICoachCard date={date} planned={planned} wellness={wellness} settings={settings} />

      <div className="cards-row cards-row-2">
        <div className="card">
          <h2>Hydration</h2>
          <HydrationCard date={date} settings={settings} refresh={refresh} />
        </div>
        <div className="card">
          <h2>Supplements</h2>
          <SupplementsCard date={date} refresh={refresh} />
        </div>
      </div>

      <div className="goals-section">
        <h2 className="goals-title">Total Macros</h2>
        <div className="goals-row">
          <Ring value={all.cal} max={macros.cal} color="#1e8ad3" label="Calories" size={120} />
          <Ring value={all.fat} max={macros.fat} color="#fe00a4" label="Fat" />
          <Ring value={all.protein} max={macros.protein} color="#043bb1" label="Protein" />
          <Ring value={all.carbs} max={macros.carbs} color="#10bc10" label="Carbs" />
        </div>
        {all.cal > 0 && <PieCharts all={all} macros={macros} />}
      </div>

      <div className="copy-meals-row">
        <button className="copy-meals-btn" onClick={() => {
          const prev = new Date(date + "T00:00:00");
          prev.setDate(prev.getDate() - 1);
          const prevDate = fmt(prev);
          let copied = 0;
          MEALS.forEach(m => {
            const prevEntries = getLog(prevDate, m);
            if (prevEntries.length > 0) {
              const existing = getLog(date, m);
              const newEntries = prevEntries.map(e => ({ ...e, id: Date.now() + Math.random() }));
              setLog(date, m, [...existing, ...newEntries]);
              copied += newEntries.length;
            }
          });
          if (copied > 0) { refresh(); showToast(`Copied ${copied} items from yesterday`); }
          else showToast("No meals to copy from yesterday");
        }}>Copy yesterday's meals</button>
      </div>

      {mealData.map(({ key, label, entries }) => (
        <CollapsibleMeal key={key} mealKey={key} label={label} entries={entries} macros={macros} fuelRecTotal={fuelRecTotal} addMeal={addMeal} rmMeal={rmMeal} />
      ))}

      <div className="meal-card">
        <div className="meal-head"><h3>How Do You Feel?</h3></div>

        {wd.id && (
          <div className="garmin-metrics">
            <div className="garmin-metrics-title">Today's Health Metrics</div>
            <div className="garmin-metrics-grid">
              {wd.weight > 0 && (
                <div className="garmin-metric">
                  <span className="garmin-metric-icon">&#x2696;&#xFE0F;</span>
                  <span className="garmin-metric-value">{wd.weight} <small>{wd.weightUnit || "kg"}</small></span>
                  <span className="garmin-metric-label">Bodyweight</span>
                </div>
              )}
              {wd.bodyFat > 0 && (
                <div className="garmin-metric">
                  <span className="garmin-metric-icon">&#x1F4CA;</span>
                  <span className="garmin-metric-value">{wd.bodyFat}%</span>
                  <span className="garmin-metric-label">Body Fat</span>
                </div>
              )}
              {wd.restingHR > 0 && (
                <div className="garmin-metric">
                  <span className="garmin-metric-icon">&#x2764;&#xFE0F;</span>
                  <span className="garmin-metric-value">{wd.restingHR} <small>bpm</small></span>
                  <span className="garmin-metric-label">Resting HR</span>
                </div>
              )}
              {wd.kcalConsumed > 0 && (
                <div className="garmin-metric">
                  <span className="garmin-metric-icon">&#x1F525;</span>
                  <span className="garmin-metric-value">{wd.kcalConsumed}</span>
                  <span className="garmin-metric-label">kCal</span>
                </div>
              )}
              {wd.sleepSecs > 0 && (
                <div className="garmin-metric">
                  <span className="garmin-metric-icon">&#x1F634;</span>
                  <span className="garmin-metric-value">{Math.floor(wd.sleepSecs / 3600)}h {Math.round((wd.sleepSecs % 3600) / 60)}m</span>
                  <span className="garmin-metric-label">Sleep</span>
                </div>
              )}
              {wd.sleepScore > 0 && (
                <div className="garmin-metric">
                  <span className="garmin-metric-icon">&#x1F31F;</span>
                  <span className="garmin-metric-value">{wd.sleepScore}</span>
                  <span className="garmin-metric-label">Sleep Score</span>
                </div>
              )}
              {wd.sleepQuality > 0 && (
                <div className="garmin-metric">
                  <span className="garmin-metric-icon">&#x1F4A4;</span>
                  <span className="garmin-metric-value">{wd.sleepQuality}</span>
                  <span className="garmin-metric-label">Sleep Quality</span>
                </div>
              )}
              {wd.vo2max > 0 && (
                <div className="garmin-metric">
                  <span className="garmin-metric-icon">&#x1F3C3;</span>
                  <span className="garmin-metric-value">{wd.vo2max}</span>
                  <span className="garmin-metric-label">VO2 Max</span>
                </div>
              )}
              {wd.spO2 > 0 && (
                <div className="garmin-metric">
                  <span className="garmin-metric-icon">&#x1FA78;</span>
                  <span className="garmin-metric-value">{wd.spO2}%</span>
                  <span className="garmin-metric-label">SpO2</span>
                </div>
              )}
              {wd.hrv > 0 && (
                <div className="garmin-metric">
                  <span className="garmin-metric-icon">&#x1F49A;</span>
                  <span className="garmin-metric-value">{wd.hrv} <small>ms</small></span>
                  <span className="garmin-metric-label">HRV</span>
                </div>
              )}
              {wd.steps > 0 && (
                <div className="garmin-metric">
                  <span className="garmin-metric-icon">&#x1F6B6;</span>
                  <span className="garmin-metric-value">{wd.steps.toLocaleString()}</span>
                  <span className="garmin-metric-label">Steps</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mood-picker">
          {[
            { value: "great", face: "\u{1F601}", label: "Great" },
            { value: "good", face: "\u{1F642}", label: "Good" },
            { value: "okay", face: "\u{1F610}", label: "Okay" },
            { value: "meh", face: "\u{1F615}", label: "Meh" },
            { value: "bad", face: "\u{1F61E}", label: "Bad" },
          ].map(m => (
            <button key={m.value} className={`mood-btn${getMood(date) === m.value ? " active" : ""}`} onClick={() => { setMood(date, getMood(date) === m.value ? "" : m.value); refresh(); }}>
              <span className="mood-face">{m.face}</span>
              <span className="mood-label">{m.label}</span>
            </button>
          ))}
        </div>
        <textarea className="daily-notes" placeholder="Energy levels, mood, digestion, anything on your mind..." value={getNotes(date)} onChange={e => { setNotes(date, e.target.value); }} />
        <button className="mood-save-btn" onClick={() => { refresh(); showToast("Notes saved"); }}>Save</button>
      </div>
    </>
  );
}

const MEAL_ICONS = {
  breakfast: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  lunch: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>,
  dinner: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 017 7c0 5-7 11-7 11S5 14 5 9a7 7 0 017-7z" fill="none"/></svg>,
  snacks: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
};

function CollapsibleMeal({ mealKey, label, entries, macros, fuelRecTotal, addMeal, rmMeal }) {
  const [collapsed, setCollapsed] = useState(false);
  const mSum = sum(entries);
  return (
    <div className={`meal-card${collapsed ? " meal-collapsed" : ""}`}>
      <div className="meal-head meal-head-toggle" onClick={() => setCollapsed(c => !c)}>
        <div className="meal-head-left">
          <span className="meal-icon">{MEAL_ICONS[mealKey] || MEAL_ICONS.snacks}</span>
          <h3>{label}</h3>
          {entries.length > 0 && <span className="meal-count">{entries.length}</span>}
        </div>
        {mSum.cal > 0 && <span className="meal-head-cal">{mSum.cal} kcal</span>}
        <span className="meal-rec">Rec: {Math.round(macros.cal / MEALS.length)} cals</span>
        <span className={`meal-chevron${collapsed ? " meal-chevron-down" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </div>
      {!collapsed && <>
        {entries.length === 0 && (
          <div className="meal-empty-state">
            <span className="meal-empty-icon">{MEAL_ICONS[mealKey] || MEAL_ICONS.snacks}</span>
            <p>No foods logged for {label.toLowerCase()}</p>
            <span className="meal-empty-hint">Search, scan a barcode, or use voice to add food</span>
          </div>
        )}
        <Entries items={entries} onRemove={(id) => rmMeal(mealKey, id)} />
        {mSum.cal > 0 && <div className="meal-sum">{mSum.cal} kcal — F:{mSum.fat}g P:{mSum.protein}g C:{mSum.carbs}g</div>}
        <FoodInput onAdd={(entry) => addMeal(mealKey, entry)} placeholder={`+ Add ${label}`} />
      </>}
    </div>
  );
}
