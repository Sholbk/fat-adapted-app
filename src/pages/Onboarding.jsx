import { useState } from "react";
import { saveSettings, DEFAULT_SETTINGS } from "../utils/storage.js";
import { backupToCloud } from "../utils/supabase.js";

const STEPS = [
  { key: "profile", title: "About You", subtitle: "Let's personalize your nutrition targets" },
  { key: "goals", title: "Your Goals", subtitle: "We'll calculate your daily macros based on this" },
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
  });
  const [saving, setSaving] = useState(false);

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
      waterTarget: 100,
      darkMode: false,
      onboardingDone: true,
    };
    saveSettings(settings);
    if (authSession?.user?.id) {
      await backupToCloud(authSession.user.id);
    }
    setSaving(false);
    onComplete(settings);
  }

  return (
    <div className="onboarding">
      <div className="onboarding-bg" />
      <div className="onboarding-card">
        <div className="onboarding-header">
          <span className="sb-logo" style={{ width: 36, height: 36, fontSize: "1.1rem" }}>F</span>
          <span className="onboarding-brand">FuelFlow</span>
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
                  <input type="number" value={data.weight} onChange={e => update({ weight: e.target.value })} placeholder="e.g. 165" />
                </label>
                <label className="ob-field">
                  <span>Height (inches) *</span>
                  <input type="number" value={data.height} onChange={e => update({ height: e.target.value })} placeholder="e.g. 68" />
                </label>
              </div>
              <div className="ob-row">
                <label className="ob-field">
                  <span>Age *</span>
                  <input type="number" value={data.age} onChange={e => update({ age: e.target.value })} placeholder="e.g. 35" />
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
                {data.weight && data.goalWeight && Number(data.goalWeight) < Number(data.weight)
                  ? `We'll target a 500 cal/day deficit to help you lose ${Number(data.weight) - Number(data.goalWeight)} lbs.`
                  : data.weight && data.goalWeight && Number(data.goalWeight) > Number(data.weight)
                  ? `We'll add 500 cal/day to help you gain ${Number(data.goalWeight) - Number(data.weight)} lbs.`
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
              <p className="ob-conn-intro">These are optional. You can always add them later in Settings.</p>
              <label className="ob-field">
                <span>Intervals.icu API Key</span>
                <input type="password" value={data.intervalsApiKey} onChange={e => update({ intervalsApiKey: e.target.value })} placeholder="From Intervals.icu Settings > Developer" autoFocus />
              </label>
              <label className="ob-field">
                <span>Intervals.icu Athlete ID</span>
                <input type="text" value={data.intervalsAthleteId} onChange={e => update({ intervalsAthleteId: e.target.value })} placeholder="e.g. i338079" />
              </label>
              <label className="ob-field">
                <span>Athletica.ai Calendar URL</span>
                <input type="url" value={data.athleticaUrl} onChange={e => update({ athleticaUrl: e.target.value })} placeholder="https://app.athletica.ai/.../athletica.ics" />
              </label>
              <p className="ob-hint">Connecting Intervals.icu lets FuelFlow auto-adjust your macros based on your training plan and completed workouts.</p>
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

        {step === 2 && (
          <button className="ob-skip" onClick={finish} disabled={saving}>Skip — I'll set this up later</button>
        )}
      </div>
    </div>
  );
}
