import { useState } from "react";

export default function WorkoutGlossary() {
  const [open, setOpen] = useState(false);
  return (
    <div className="wo-glossary">
      <button className="wo-glossary-toggle" onClick={() => setOpen(o => !o)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        {open ? "Hide Glossary" : "What does this mean?"}
      </button>
      {open && (
        <div className="wo-glossary-body">
          <div className="wo-glossary-section">
            <h4>Status Badges</h4>
            <dl>
              <dt><span className="wo-status-badge wo-status-done">Completed</span></dt>
              <dd>Workout was in your plan and you completed it (recorded via Strava/Garmin)</dd>
              <dt><span className="wo-status-badge wo-status-plan">Planned</span></dt>
              <dd>Scheduled workout from your Athletica training plan — not yet completed</dd>
              <dt><span className="wo-status-badge wo-status-extra">Unplanned</span></dt>
              <dd>Activity recorded on Strava that wasn't part of your training plan</dd>
            </dl>
          </div>
          <div className="wo-glossary-section">
            <h4>Workout Metrics</h4>
            <dl>
              <dt>Load</dt>
              <dd>Training stress score for this workout — higher means more demanding</dd>
              <dt>Intensity</dt>
              <dd>How hard the session is relative to your threshold (% of max)</dd>
              <dt>Fitness (CTL)</dt>
              <dd>Chronic Training Load — your long-term fitness trend (higher = fitter)</dd>
              <dt>Fatigue (ATL)</dt>
              <dd>Acute Training Load — recent training stress (higher = more tired)</dd>
            </dl>
          </div>
          <div className="wo-glossary-section">
            <h4>Heart Rate Zones</h4>
            <dl>
              <dt><span style={{color:"#1e8ad3"}}>Z1</span> Recovery</dt>
              <dd>Very easy effort — active recovery, warm-up/cool-down</dd>
              <dt><span style={{color:"#10bc10"}}>Z2</span> Endurance</dt>
              <dd>Easy aerobic pace — fat-burning zone, builds base fitness</dd>
              <dt><span style={{color:"#90c010"}}>Z3</span> Tempo</dt>
              <dd>Moderate effort — comfortably hard, improves aerobic capacity</dd>
              <dt><span style={{color:"#e8c010"}}>Z4</span> Threshold</dt>
              <dd>Hard effort — at or near lactate threshold</dd>
              <dt><span style={{color:"#e87010"}}>Z5</span> VO2max</dt>
              <dd>Very hard — improves maximum oxygen uptake</dd>
              <dt><span style={{color:"#fe00a4"}}>Z6</span> Anaerobic</dt>
              <dd>Near-max effort — short, intense intervals</dd>
              <dt><span style={{color:"#cc0050"}}>Z7</span> Neuromuscular</dt>
              <dd>Max sprints — develops peak power and speed</dd>
            </dl>
          </div>
          <div className="wo-glossary-section">
            <h4>Session Types</h4>
            <dl>
              <dt>Endurance</dt>
              <dd>Low intensity, long duration — prioritize fat as fuel, moderate carbs</dd>
              <dt>Lower Tempo</dt>
              <dd>Steady moderate effort — balanced fuel with slightly more carbs</dd>
              <dt>Upper Tempo</dt>
              <dd>Harder sustained effort — increase carb intake for performance</dd>
              <dt>Threshold</dt>
              <dd>High intensity at lactate threshold — higher carb needs</dd>
              <dt>VO2max / Anaerobic</dt>
              <dd>Very high intensity — maximum carb fueling for performance</dd>
              <dt>Rest Day</dt>
              <dd>No training — lower calories, focus on recovery nutrition</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
