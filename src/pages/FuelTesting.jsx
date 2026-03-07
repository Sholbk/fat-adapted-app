import { useState, useRef } from "react";
import { getFuelTests, saveFuelTests } from "../utils/storage.js";

const FEEL_OPTIONS = [
  { value: "great", label: "Great", face: "\u{1F601}" },
  { value: "good", label: "Good", face: "\u{1F642}" },
  { value: "okay", label: "Okay", face: "\u{1F610}" },
  { value: "bad", label: "Bad", face: "\u{1F61E}" },
  { value: "terrible", label: "Terrible", face: "\u{1F92E}" },
];

const TIMING_OPTIONS = ["Before", "During", "After"];

export default function FuelTesting({ date, refresh, showToast }) {
  const tests = getFuelTests();
  const [adding, setAdding] = useState(false);

  function deleteTest(id) {
    saveFuelTests(getFuelTests().filter(t => t.id !== id));
    refresh();
    showToast("Test entry deleted");
  }

  return (
    <div className="page-content">
      <h2>Fuel Testing</h2>
      <p className="page-sub">Track how different nutrition performs during training. Log what you ate, how you felt, and your performance metrics.</p>

      <button className="use-plan-btn" style={{ marginBottom: "1rem" }} onClick={() => setAdding(true)}>
        + New Fuel Test
      </button>

      {adding && (
        <FuelTestForm
          date={date}
          onSave={(entry) => {
            saveFuelTests([entry, ...getFuelTests()]);
            setAdding(false);
            refresh();
            showToast(`Fuel test logged: ${entry.item}`);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {tests.length === 0 && !adding && (
        <div className="ft-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="36" height="36"><path d="M9 2v6"/><path d="M15 2v6"/><path d="M12 17v4"/><path d="M5 8h14a2 2 0 012 2v2a6 6 0 01-6 6h-6a6 6 0 01-6-6v-2a2 2 0 012-2z"/></svg>
          <p>No fuel tests yet</p>
          <span>Test different nutrition during workouts to find what works best for you</span>
        </div>
      )}

      {tests.length > 0 && (
        <div className="ft-list">
          {tests.map(t => (
            <FuelTestCard key={t.id} test={t} onDelete={deleteTest} />
          ))}
        </div>
      )}
    </div>
  );
}

function FuelTestForm({ date, onSave, onCancel }) {
  const [item, setItem] = useState("");
  const [brand, setBrand] = useState("");
  const [amount, setAmount] = useState("");
  const [timing, setTiming] = useState("During");
  const [feel, setFeel] = useState("");
  const [watts, setWatts] = useState("");
  const [pace, setPace] = useState("");
  const [peakHR, setPeakHR] = useState("");
  const [avgHR, setAvgHR] = useState("");
  const [notes, setNotes] = useState("");
  const [workoutType, setWorkoutType] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!item.trim()) return;
    onSave({
      id: Date.now(),
      date,
      item: item.trim(),
      brand: brand.trim(),
      amount: amount.trim(),
      timing,
      feel,
      watts: watts ? Number(watts) : null,
      pace: pace.trim(),
      peakHR: peakHR ? Number(peakHR) : null,
      avgHR: avgHR ? Number(avgHR) : null,
      workoutType: workoutType.trim(),
      notes: notes.trim(),
    });
  }

  return (
    <form className="ft-form settings-card" onSubmit={handleSubmit}>
      <h3>Log Fuel Test</h3>

      <div className="ft-form-section">
        <h4>Nutrition Item</h4>
        <div className="settings-grid">
          <label className="sett-field">
            <span>Item Name *</span>
            <input type="text" value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. Maurten Gel 100, Banana, Salt Tabs" required />
          </label>
          <label className="sett-field">
            <span>Brand</span>
            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Maurten, SiS, Skratch" />
          </label>
          <label className="sett-field">
            <span>Amount</span>
            <input type="text" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1 gel, 500ml, 2 tabs" />
          </label>
          <label className="sett-field">
            <span>Timing</span>
            <select value={timing} onChange={e => setTiming(e.target.value)}>
              {TIMING_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="sett-field">
            <span>Workout Type</span>
            <input type="text" value={workoutType} onChange={e => setWorkoutType(e.target.value)} placeholder="e.g. Long Ride, Tempo Run, Brick" />
          </label>
        </div>
      </div>

      <div className="ft-form-section">
        <h4>How Did It Make You Feel?</h4>
        <div className="ft-feel-picker">
          {FEEL_OPTIONS.map(f => (
            <button key={f.value} type="button" className={`mood-btn${feel === f.value ? " active" : ""}`} onClick={() => setFeel(feel === f.value ? "" : f.value)}>
              <span className="mood-face">{f.face}</span>
              <span className="mood-label">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ft-form-section">
        <h4>Performance Metrics</h4>
        <div className="settings-grid">
          <label className="sett-field">
            <span>Watts (avg power)</span>
            <input type="number" value={watts} onChange={e => setWatts(e.target.value)} placeholder="e.g. 185" min="0" />
          </label>
          <label className="sett-field">
            <span>Pace</span>
            <input type="text" value={pace} onChange={e => setPace(e.target.value)} placeholder="e.g. 8:30/mi or 20mph" />
          </label>
          <label className="sett-field">
            <span>Peak Heart Rate</span>
            <input type="number" value={peakHR} onChange={e => setPeakHR(e.target.value)} placeholder="e.g. 172" min="0" max="250" />
          </label>
          <label className="sett-field">
            <span>Average Heart Rate</span>
            <input type="number" value={avgHR} onChange={e => setAvgHR(e.target.value)} placeholder="e.g. 145" min="0" max="250" />
          </label>
        </div>
      </div>

      <div className="ft-form-section">
        <h4>Notes</h4>
        <textarea className="daily-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="GI issues? Energy crash? Felt strong? Any observations..." />
      </div>

      <div className="ft-form-actions">
        <button type="submit" className="use-plan-btn">Save Fuel Test</button>
        <button type="button" className="copy-meals-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function FuelTestCard({ test: t, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const feelObj = FEEL_OPTIONS.find(f => f.value === t.feel);
  const hasMetrics = t.watts || t.pace || t.peakHR || t.avgHR;

  return (
    <div className={`ft-card${feelObj ? ` ft-feel-${t.feel}` : ""}`}>
      <div className="ft-card-head" onClick={() => setExpanded(e => !e)}>
        <div className="ft-card-main">
          <strong className="ft-card-item">{t.item}</strong>
          {t.brand && <span className="ft-card-brand">{t.brand}</span>}
          <span className="ft-card-timing">{t.timing}</span>
        </div>
        <div className="ft-card-right">
          {feelObj && <span className="ft-card-feel" title={feelObj.label}>{feelObj.face}</span>}
          <span className="ft-card-date">{new Date(t.date + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span className={`meal-chevron${expanded ? "" : " meal-chevron-down"}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </div>
      </div>

      {expanded && (
        <div className="ft-card-body">
          {t.amount && <div className="ft-detail"><span>Amount</span><strong>{t.amount}</strong></div>}
          {t.workoutType && <div className="ft-detail"><span>Workout</span><strong>{t.workoutType}</strong></div>}

          {hasMetrics && (
            <div className="ft-metrics">
              {t.watts && <div className="ft-metric"><span>Watts</span><strong>{t.watts}W</strong></div>}
              {t.pace && <div className="ft-metric"><span>Pace</span><strong>{t.pace}</strong></div>}
              {t.peakHR && <div className="ft-metric"><span>Peak HR</span><strong>{t.peakHR} bpm</strong></div>}
              {t.avgHR && <div className="ft-metric"><span>Avg HR</span><strong>{t.avgHR} bpm</strong></div>}
            </div>
          )}

          {feelObj && (
            <div className="ft-feel-row">
              <span>Felt:</span> <span className="ft-feel-label">{feelObj.face} {feelObj.label}</span>
            </div>
          )}

          {t.notes && <div className="ft-notes">{t.notes}</div>}

          <button className="water-btn water-undo" style={{ marginTop: "0.5rem" }} onClick={() => onDelete(t.id)}>Delete</button>
        </div>
      )}
    </div>
  );
}
