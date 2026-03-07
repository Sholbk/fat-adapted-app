import { today } from "../utils/parsing.js";
import { MEALS, getLog, getSettings, saveSettings } from "../utils/storage.js";

function calcStreak() {
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().split("T")[0];
    const hasFood = MEALS.some(m => getLog(ds, m).length > 0);
    if (!hasFood && ds !== today()) break;
    if (hasFood) streak++;
    d.setDate(d.getDate() - 1);
    if (streak > 365) break;
  }
  return streak;
}

export default function Topbar({ date, shiftDate, settings, setSettings, session, userName }) {
  const dayDisplay = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const streak = calcStreak();

  return (
    <div className="topbar">
      <div className="topbar-greet">
        <h1>{greeting}, {userName}!</h1>
        <p className="topbar-phase" style={{ color: session.color }}>{session.label} — {session.target}</p>
      </div>
      <div className="topbar-date">
        <button onClick={() => shiftDate(-1)}>&larr;</button>
        <button className="topbar-today" onClick={() => shiftDate(0)}>TODAY</button>
        <button onClick={() => shiftDate(1)}>&rarr;</button>
      </div>
      <span className="topbar-datestr">{dayDisplay}</span>
      {streak > 0 && <span className="streak-badge">{streak} day streak</span>}
      <button className="dark-toggle" onClick={() => {
        const next = { ...settings, darkMode: !settings.darkMode };
        setSettings(next);
        saveSettings(next);
      }} title="Toggle dark mode">
        {settings.darkMode ? "\u2600" : "\u263E"}
      </button>
    </div>
  );
}
