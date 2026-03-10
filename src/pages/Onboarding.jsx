import { useState } from "react";
import { saveSettings, DEFAULT_SETTINGS } from "../utils/storage.js";
import { backupToCloud, saveApiKeys } from "../utils/supabase.js";

const STEPS = [
  { key: "profile", title: "About You", subtitle: "Let's personalize your nutrition targets" },
  { key: "goals", title: "Your Goals", subtitle: "We'll calculate your daily macros based on this" },
  { key: "races", title: "Race Calendar", subtitle: "Add your races to auto-calculate training phases and nutrition periodization" },
  { key: "connections", title: "Connect Your Training", subtitle: "Optional — link your training platforms for auto-synced nutrition" },
];

export default function Onboarding({ authSession, onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    ...DEFAULT_SETTINGS,
    name: "",
    weight: "",
    height: "",
    age: "",
    gender: "female",
    goalWeight: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    intervalsApiKey: "",
    intervalsAthleteId: "",
    athleticaUrl: "",
    races: [],
  });
  const [saving, setSaving] = useState(false);
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [racePriority, setRacePriority] = useState("A");

  function update(fields) {
    setData(d => ({ ...d, ...fields }));
  }

  function canAdvance() {
    if (step === 0) return data.name.trim() && data.weight && data.height && data.age;
    if (step === 1) return data.goalWeight;
    return true;
  }

  async function finish() {
    setSaving(true);
    const settings = {
      ...DEFAULT_SETTINGS,
      name: data.name.trim(),
      weight: Number(data.weight) || 150,
      height: Number(data.height) || 67,
      age: Number(data.age) || 30,
      gender: data.gender,
      goalWeight: Number(data.goalWeight) || Number(data.weight) || 150,
      timezone: data.timezone,
      startDate: new Date().toISOString().slice(0, 10),
      intervalsApiKey: data.intervalsApiKey.trim(),
      intervalsAthleteId: data.intervalsAthleteId.trim(),
      athleticaUrl: data.athleticaUrl.trim(),
      races: data.races,
      waterTarget: 100,
      darkMode: false,
      onboardingDone: true,
    };
    saveSettings(settings);
    if (authSession?.user?.id) {
      try {
        await backupToCloud(authSession.user.id);
        if (data.intervalsApiKey || data.intervalsAthleteId) {
          await saveApiKeys(authSession.user.id, {
            intervalsApiKey: data.intervalsApiKey.trim(),
            intervalsAthleteId: data.intervalsAthleteId.trim(),
            athleticaUrl: data.athleticaUrl.trim(),
          });
        }
      } catch (e) {
        console.warn("Cloud backup failed during onboarding:", e);
      }
    }
    setSaving(false);
    onComplete(settings);
  }

  return (
    <div className="onboarding">
      <div className="onboarding-bg" />
      <div className="onboarding-card">
        <div className="onboarding-header">
          <span className="sb-logo" style={{ width: 36, height: 36 }}><svg viewBox="0 0 192 192" width="22" height="22"><path d="M108 28L68 100h28L80 164l52-80h-30z" fill="#fff"/></svg></span>
          <span className="onboarding-brand">FastFuel</span>
        </div>

        <div className="onboarding-progress">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`onboarding-dot${i === step ? " active" : i < step ? " done" : ""}`} />
          ))}
        </div>

        <h2>{STEPS[step].title}</h2>
        <p className="onboarding-sub">{STEPS[step].subtitle}</p>

        <div className="onboarding-fields page-fade" key={step}>
          {step === 0 && (
            <>
              <label className="ob-field">
                <span>Name *</span>
                <input type="text" value={data.name} onChange={e => update({ name: e.target.value })} placeholder="What should we call you?" autoFocus />
              </label>
              <div className="ob-row">
                <label className="ob-field">
                  <span>Starting Weight (lbs) *</span>
                  <input type="number" value={data.weight} onChange={e => update({ weight: e.target.value })} placeholder="e.g. 165" min="50" max="500" />
                </label>
                <label className="ob-field">
                  <span>Height (inches) *</span>
                  <input type="number" value={data.height} onChange={e => update({ height: e.target.value })} placeholder="e.g. 68" min="36" max="96" />
                </label>
              </div>
              <div className="ob-row">
                <label className="ob-field">
                  <span>Age *</span>
                  <input type="number" value={data.age} onChange={e => update({ age: e.target.value })} placeholder="e.g. 35" min="13" max="120" />
                </label>
                <label className="ob-field">
                  <span>Gender</span>
                  <select value={data.gender} onChange={e => update({ gender: e.target.value })}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </label>
              </div>
              <label className="ob-field">
                <span>Time Zone</span>
                <select value={data.timezone} onChange={e => update({ timezone: e.target.value })}>
                  {Intl.supportedValuesOf("timeZone").map(tz => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <label className="ob-field">
                <span>Goal Weight (lbs) *</span>
                <input type="number" value={data.goalWeight} onChange={e => update({ goalWeight: e.target.value })} placeholder="e.g. 155" autoFocus />
              </label>
              <p className="ob-hint">
                {data.weight && data.goalWeight && Number(data.goalWeight) !== Number(data.weight)
                  ? "Macros will be calculated based on your goal weight."
                  : "Set the same as your current weight to maintain."}
              </p>
              <label className="ob-field">
                <span>Daily Water Target (oz)</span>
                <input type="number" value={data.waterTarget || 100} onChange={e => update({ waterTarget: Number(e.target.value) || 100 })} placeholder="100" />
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <p className="ob-conn-desc">Your A race anchors your periodization — training phases and nutrition will auto-adjust based on weeks until race day. B and C races are optional.</p>

              <div className="ob-race-form">
                <input type="text" className="ob-race-input" placeholder="Race name" value={raceName} onChange={e => setRaceName(e.target.value)} autoFocus />
                <input type="date" className="ob-race-input ob-race-date" value={raceDate} onChange={e => setRaceDate(e.target.value)} />
                <select className="ob-race-select" value={racePriority} onChange={e => setRacePriority(e.target.value)}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
                <button className="ob-race-add" onClick={() => {
                  if (!raceName.trim() || !raceDate) return;
                  const nextRaces = [...data.races, { name: raceName.trim(), date: raceDate, priority: racePriority }]
                    .sort((a, b) => a.date.localeCompare(b.date));
                  update({ races: nextRaces });
                  setRaceName("");
                  setRaceDate("");
                }}>Add</button>
              </div>

              <div className="ob-race-legend">
                <span><strong>A</strong> — Full periodization anchor (Peak + Race taper)</span>
                <span><strong>B</strong> — Mini taper (reduced volume 3-5 days)</span>
                <span><strong>C</strong> — No taper (counts as a hard workout)</span>
              </div>

              {data.races.length > 0 && (
                <div className="ob-race-list">
                  {data.races.map((r, i) => (
                    <div key={i} className="ob-race-item">
                      <span className="ob-race-pri" data-pri={r.priority}>{r.priority}</span>
                      <span className="ob-race-name">{r.name}</span>
                      <span className="ob-race-date-label">{new Date(r.date + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <button className="ob-race-remove" onClick={() => update({ races: data.races.filter((_, j) => j !== i) })}>&times;</button>
                    </div>
                  ))}
                </div>
              )}

              <p className="ob-hint">You can add or change races later on the Phase of Training page.</p>
            </>
          )}

          {step === 3 && (
            <>
              <div className="ob-conn-section">
                <div className="ob-conn-header">
                  <h4>Athletica.ai Calendar URL</h4>
                  <span className="ob-conn-tag ob-conn-recommended">Recommended</span>
                </div>
                <p className="ob-conn-desc">Required for individual workout calculations. FastFuel reads your training plan to calculate daily nutrition targets.</p>
                <label className="ob-field">
                  <input type="url" value={data.athleticaUrl} onChange={e => update({ athleticaUrl: e.target.value })} placeholder="https://app.athletica.ai/.../athletica.ics" autoFocus />
                </label>
                <p className="ob-conn-help">
                  <a href="https://app.athletica.ai" target="_blank" rel="noopener noreferrer">Find your URL</a>: Athletica.ai &rarr; Preferences &rarr; Training Plan &rarr; Calendar Sync &rarr; copy the Training Calendar URL.
                </p>
                <p className="ob-conn-help">You can also use any Intervals.icu calendar link (.ics) here.</p>
              </div>

              <div className="ob-conn-section">
                <div className="ob-conn-header">
                  <h4>Intervals.icu</h4>
                  <span className="ob-conn-tag ob-conn-optional">Optional</span>
                </div>
                <p className="ob-conn-desc">Only needed if you want workout confirmation, mood/sleep/HRV tracking, and AI-powered automatic diet adjustments. Intervals.icu connects to 100+ apps including Garmin, Strava, Polar, Wahoo, Suunto, Coros, Zwift, Oura, and WHOOP.</p>
                <label className="ob-field">
                  <span>API Key</span>
                  <input type="password" value={data.intervalsApiKey} onChange={e => update({ intervalsApiKey: e.target.value })} placeholder="From Intervals.icu Settings > Developer" />
                </label>
                <label className="ob-field">
                  <span>Athlete ID</span>
                  <input type="text" value={data.intervalsAthleteId} onChange={e => update({ intervalsAthleteId: e.target.value })} placeholder="e.g. i338079" />
                </label>
                <p className="ob-conn-help">
                  <a href="https://intervals.icu" target="_blank" rel="noopener noreferrer">Find your credentials</a>: Intervals.icu &rarr; Settings &rarr; Developer &rarr; copy your API Key and Athlete ID.
                </p>
                <p className="ob-conn-help">
                  Intervals.icu also has a <a href="https://intervals.icu" target="_blank" rel="noopener noreferrer">calendar link</a> and integrates with Athletica.ai, so your training data flows automatically between platforms.
                </p>
              </div>

              <p className="ob-hint">You can always add or change these later in Settings.</p>
            </>
          )}
        </div>

        <div className="onboarding-actions">
          {step > 0 && (
            <button className="ob-back" onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          {step < STEPS.length - 1 ? (
            <button className="ob-next" disabled={!canAdvance()} onClick={() => setStep(s => s + 1)}>Continue</button>
          ) : (
            <button className="ob-next" disabled={saving} onClick={finish}>{saving ? "Setting up..." : "Get Started"}</button>
          )}
        </div>

        {step === 3 && (
          <button className="ob-skip" onClick={finish} disabled={saving}>Skip — I'll set this up later</button>
        )}
      </div>
    </div>
  );
}
