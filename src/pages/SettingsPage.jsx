import { useRef, useState, useEffect } from "react";
import { getWeightLog, addWeightEntry, getSettings, clearAllData, setStoredUserId } from "../utils/storage.js";
import { signOut, backupToCloud, saveApiKeys } from "../utils/supabase.js";
import { TermsContent, PrivacyContent, ResourcesContent } from "../components/FooterPages.jsx";

export default function SettingsPage({ date, draft, updateDraft, handleSave, saved, settings, setSettings, setDraft, refresh, showToast, authSession, setAuthSession, syncing, setSyncing }) {
  const [footerPage, setFooterPage] = useState(null);

  useEffect(() => {
    if (footerPage) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [footerPage]);

  return (
    <div className="page-content">
      {footerPage && (
        <div className="fp-overlay" onClick={() => setFooterPage(null)}>
          <div className="fp-modal" onClick={e => e.stopPropagation()}>
            <button className="fp-close" onClick={() => setFooterPage(null)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {footerPage === "terms" && <TermsContent />}
            {footerPage === "privacy" && <PrivacyContent />}
            {footerPage === "resources" && <ResourcesContent />}
          </div>
        </div>
      )}
      <h2>Settings</h2>
      <p className="page-sub">Set your goals and personal info. Macros will adjust automatically.</p>

      <div className="settings-card">
        <h3>Your Profile</h3>
        <div className="settings-grid">
          <label className="sett-field">
            <span>Name</span>
            <input type="text" value={draft.name || ""} onChange={e => updateDraft({ name: e.target.value })} />
          </label>
          <label className="sett-field">
            <span>Starting Weight (lbs)</span>
            <input type="number" value={draft.weight} onChange={e => updateDraft({ weight: Number(e.target.value) || 0 })} />
          </label>
          <label className="sett-field">
            <span>Start Date</span>
            <input type="date" value={draft.startDate} onChange={e => updateDraft({ startDate: e.target.value })} />
          </label>
          <label className="sett-field">
            <span>Height (inches)</span>
            <input type="number" value={draft.height} onChange={e => updateDraft({ height: Number(e.target.value) || 0 })} />
          </label>
          <label className="sett-field">
            <span>Age</span>
            <input type="number" value={draft.age} onChange={e => updateDraft({ age: Number(e.target.value) || 0 })} />
          </label>
          <label className="sett-field">
            <span>Gender</span>
            <select value={draft.gender || "female"} onChange={e => updateDraft({ gender: e.target.value })}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </label>
          <label className="sett-field">
            <span>Time Zone</span>
            <select value={draft.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} onChange={e => updateDraft({ timezone: e.target.value })}>
              {Intl.supportedValuesOf("timeZone").map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="settings-card">
        <h3>Weight Goal</h3>
        <div className="settings-grid">
          <label className="sett-field">
            <span>Goal Weight (lbs)</span>
            <input type="number" value={draft.goalWeight} onChange={e => updateDraft({ goalWeight: Number(e.target.value) || 0 })} />
          </label>
          <label className="sett-field">
            <span>Daily Water Target (oz)</span>
            <input type="number" value={draft.waterTarget || 100} onChange={e => updateDraft({ waterTarget: Number(e.target.value) || 100 })} />
          </label>
        </div>
      </div>

      <div className="settings-card">
        <h3>Weight Log</h3>
        <WeightLogSection date={date} refresh={refresh} showToast={showToast} />
      </div>

      <button className="sett-save" onClick={() => {
        handleSave();
        if (authSession?.user?.id && (draft.intervalsApiKey || draft.intervalsAthleteId)) {
          saveApiKeys(authSession.user.id, {
            intervalsApiKey: draft.intervalsApiKey || "",
            intervalsAthleteId: draft.intervalsAthleteId || "",
            athleticaUrl: draft.athleticaUrl || "",
          }).catch(e => console.warn("Failed to save API keys:", e));
        }
      }}>{saved ? "Saved!" : "Save Settings"}</button>

      <div className="settings-card">
        <h3>Connections</h3>

        <h4 className="conn-section-label">Athletica.ai <span className="ob-conn-tag ob-conn-recommended">Recommended</span></h4>
        <p className="conn-help">Required for individual workout calculations. FastFuel reads your training plan to calculate daily nutrition targets.</p>
        <div className="settings-grid" style={{ marginBottom: "0.5rem" }}>
          <label className="sett-field">
            <span>Athletica Calendar URL</span>
            <input type="url" placeholder="https://app.athletica.ai/.../athletica.ics" value={draft.athleticaUrl || ""} onChange={e => updateDraft({ athleticaUrl: e.target.value })} />
          </label>
        </div>
        <p className="conn-help"><a href="https://app.athletica.ai" target="_blank" rel="noopener noreferrer">Find your URL</a>: Athletica.ai &rarr; Preferences &rarr; Training Plan &rarr; Calendar Sync &rarr; copy the Training Calendar URL.</p>

        <h4 className="conn-section-label" style={{ marginTop: "1.25rem" }}>Intervals.icu <span className="ob-conn-tag ob-conn-optional">Optional</span></h4>
        <p className="conn-help">Only needed if you want workout confirmation, mood/sleep/HRV tracking, and AI-powered automatic diet adjustments. Connects to 100+ apps including Garmin, Strava, Polar, Wahoo, Suunto, Coros, Zwift, Oura, and WHOOP.</p>
        <div className="settings-grid" style={{ marginBottom: "0.5rem" }}>
          <label className="sett-field">
            <span>API Key</span>
            <input type="password" placeholder="From Intervals.icu Settings > Developer" value={draft.intervalsApiKey || ""} onChange={e => updateDraft({ intervalsApiKey: e.target.value })} />
          </label>
          <label className="sett-field">
            <span>Athlete ID</span>
            <input type="text" placeholder="e.g. i338079" value={draft.intervalsAthleteId || ""} onChange={e => updateDraft({ intervalsAthleteId: e.target.value })} />
          </label>
        </div>
        <p className="conn-help"><a href="https://intervals.icu" target="_blank" rel="noopener noreferrer">Find your credentials</a>: Intervals.icu &rarr; Settings &rarr; Developer &rarr; copy your API Key and Athlete ID.</p>
        <p className="conn-help">Intervals.icu also has a calendar link and integrates with Athletica.ai, so your training data flows automatically between platforms.</p>

        <div className="conn-list" style={{ marginTop: "1rem" }}>
          <div className={`conn${draft.athleticaUrl ? " connected" : ""}`}><div className="conn-info"><strong>Athletica.ai</strong><span>Planned workouts, training plan calendar</span></div><span className={`conn-status${draft.athleticaUrl ? " on" : ""}`}>{draft.athleticaUrl ? "Connected" : "Not configured"}</span></div>
          <div className={`conn${draft.intervalsApiKey && draft.intervalsAthleteId ? " connected" : ""}`}><div className="conn-info"><strong>Intervals.icu</strong><span>Wellness data, training load, fitness metrics, 100+ app integrations</span></div><span className={`conn-status${draft.intervalsApiKey && draft.intervalsAthleteId ? " on" : ""}`}>{draft.intervalsApiKey && draft.intervalsAthleteId ? "Connected" : "Not configured"}</span></div>
          <div className="conn connected"><div className="conn-info"><strong>FatSecret</strong><span>Food search, nutrition data, and barcode lookup</span></div><span className="conn-status on">Connected</span></div>
        </div>
      </div>

      {authSession && (
        <div className="settings-card">
          <h3>Account</h3>
          <p className="cloud-user">Signed in as <strong>{authSession.user.email}</strong></p>
          <div className="cloud-btns" style={{ marginTop: "0.5rem" }}>
            <button className="cloud-btn" disabled={syncing} onClick={async () => {
              setSyncing(true);
              const { error } = await backupToCloud(authSession.user.id) || {};
              setSyncing(false);
              showToast(error ? `Backup failed: ${error.message}` : "Data backed up to cloud");
            }}>{syncing ? "Syncing..." : "Backup Now"}</button>
          </div>
        </div>
      )}

      {authSession && (
        <button className="sett-signout" onClick={async () => { clearAllData(); setStoredUserId(null); await signOut(); window.location.reload(); }}>Sign Out</button>
      )}

      <div className="sett-footer-links">
        <button onClick={() => setFooterPage("terms")}>Terms & Conditions</button>
        <button onClick={() => setFooterPage("privacy")}>Privacy</button>
        <button onClick={() => setFooterPage("resources")}>Resources</button>
      </div>
    </div>
  );
}

function WeightLogSection({ date, refresh, showToast }) {
  const weightRef = useRef(null);
  const wlog = getWeightLog();
  const recent = wlog.slice(-14);

  return (
    <>
      <div className="weight-log-input">
        <input type="number" placeholder="Today's weight (lbs)" ref={weightRef} step="0.1" />
        <button className="weight-log-btn" onClick={() => {
          const w = parseFloat(weightRef.current?.value);
          if (w > 0) { addWeightEntry(date, w); weightRef.current.value = ""; refresh(); showToast(`Weight logged: ${w} lbs`); }
        }}>Log Weight</button>
      </div>
      {recent.length === 0 ? (
        <p className="meal-empty">No weight entries yet</p>
      ) : (
        <WeightChart entries={recent} />
      )}
    </>
  );
}

function WeightChart({ entries }) {
  const min = Math.min(...entries.map(e => e.weight));
  const max = Math.max(...entries.map(e => e.weight));
  const range = max - min || 1;

  return (
    <div className="weight-chart">
      <div className="weight-chart-labels">
        <span>{max} lbs</span>
        <span>{min} lbs</span>
      </div>
      <div className="weight-chart-area">
        <svg viewBox={`0 0 ${entries.length * 40} 100`} preserveAspectRatio="none" className="weight-svg">
          <polyline
            fill="none" stroke="#1e8ad3" strokeWidth="2"
            points={entries.map((e, i) => `${i * 40 + 20},${100 - ((e.weight - min) / range) * 80 - 10}`).join(" ")}
          />
          {entries.map((e, i) => (
            <circle key={i} cx={i * 40 + 20} cy={100 - ((e.weight - min) / range) * 80 - 10} r="3" fill="#1e8ad3" />
          ))}
        </svg>
        <div className="weight-chart-dates">
          {entries.map((e, i) => (
            <span key={i}>{new Date(e.date + "T12:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

