import { useState } from "react";
import { signIn, signUp } from "../utils/supabase.js";

export default function LandingPage({ showToast }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    const { error } = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password);
    setBusy(false);
    if (error) {
      showToast(error.message);
    } else if (mode === "signup") {
      showToast("Check your email to confirm your account");
    }
  }

  return (
    <div className="landing">
      <div className="landing-bg" />
      <div className="landing-content">
        <div className="landing-hero">
          <div className="landing-logo">
            <span className="sb-logo" style={{ width: 48, height: 48, fontSize: "1.5rem" }}>F</span>
          </div>
          <h1>FastFuel</h1>
          <p className="landing-tagline">Smart Nutrition for endurance athletes</p>
          <div className="landing-features">
            <div className="landing-feat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <div>
                <strong>Training-Synced Macros</strong>
                <span>Auto-adjusts daily nutrition to match your workout intensity</span>
              </div>
            </div>
            <div className="landing-feat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
              <div>
                <strong>Meal Logging + Recipes</strong>
                <span>Search foods, scan barcodes, use voice, and build custom recipes</span>
              </div>
            </div>
            <div className="landing-feat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M9 2v6"/><path d="M15 2v6"/><path d="M12 17v4"/><path d="M5 8h14a2 2 0 012 2v2a6 6 0 01-6 6h-6a6 6 0 01-6-6v-2a2 2 0 012-2z"/></svg>
              <div>
                <strong>Fuel Testing</strong>
                <span>Track how nutrition affects your performance and feel</span>
              </div>
            </div>
            <div className="landing-feat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              <div>
                <strong>Intervals.icu + Strava + Athletica.ai</strong>
                <span>Connect your training data for automatic workout detection</span>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-auth">
          <div className="landing-auth-card">
            <h2>{mode === "login" ? "Welcome Back" : "Create Account"}</h2>
            <p>{mode === "login" ? "Sign in to your FastFuel account" : "Start optimizing your race-day nutrition"}</p>
            <form onSubmit={handleSubmit}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="cloud-input" required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="cloud-input" required minLength={6} />
              <button type="submit" className="landing-submit" disabled={busy}>
                {busy ? "..." : mode === "login" ? "Sign In" : "Sign Up"}
              </button>
            </form>
            <button className="cloud-toggle" onClick={() => setMode(m => m === "login" ? "signup" : "login")}>
              {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
