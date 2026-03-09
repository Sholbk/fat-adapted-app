import { useState, useRef, useEffect } from "react";
import { signIn, signUp } from "../utils/supabase.js";
import { TermsContent, PrivacyContent, ResourcesContent } from "../components/FooterPages.jsx";

function AuthCard({ mode, setMode, email, setEmail, password, setPassword, busy, handleSubmit }) {
  return (
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
      <div className="landing-beta">Free during beta. No credit card required.</div>
      <button className="cloud-toggle" onClick={() => setMode(m => m === "login" ? "signup" : "login")}>
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

export default function LandingPage({ showToast }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const authRef = useRef(null);

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

  function scrollToAuth() {
    authRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const [footerPage, setFooterPage] = useState(null);

  useEffect(() => {
    if (footerPage) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [footerPage]);

  const authProps = { mode, setMode, email, setEmail, password, setPassword, busy, handleSubmit };

  return (
    <div className="landing">
      <div className="landing-bg" />

      {footerPage && (
        <div className="fp-overlay" onClick={() => setFooterPage(null)}>
          <div className="fp-modal" onClick={e => e.stopPropagation()}>
            <button className="fp-close" onClick={() => setFooterPage(null)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {footerPage === "terms" && <TermsContent />}
            {footerPage === "privacy" && <PrivacyContent />}
            {footerPage === "methodology" && <ResourcesContent />}
          </div>
        </div>
      )}

      {/* ── Section 1: Hero + Auth ── */}
      <section className="landing-section landing-hero-section">
        <div className="landing-content">
          <div className="landing-hero">
            <div className="landing-logo">
              <span className="sb-logo" style={{ width: 48, height: 48 }}>
                <svg viewBox="0 0 192 192" width="28" height="28"><path d="M108 28L68 100h28L80 164l52-80h-30z" fill="#fff"/></svg>
              </span>
            </div>
            <h1>Your training plan already knows what fuel you need.</h1>
            <p className="landing-tagline">FastFuel reads your <a href="https://athletica.ai" target="_blank" rel="noopener noreferrer" className="landing-link">Athletica.ai</a> calendar and auto-generates fat-adapted macros that shift with workout intensity. Built on the same periodized nutrition science used by elite WorldTour teams.</p>
            <div className="landing-badges">
              <a href="https://athletica.ai" target="_blank" rel="noopener noreferrer" className="landing-badge">Athletica.ai</a>
              <a href="https://intervals.icu" target="_blank" rel="noopener noreferrer" className="landing-badge">Intervals.icu</a>
              <a href="https://www.strava.com" target="_blank" rel="noopener noreferrer" className="landing-badge">Strava</a>
            </div>
            <p className="landing-diff">Other nutrition apps assume you eat 60% carbs. FastFuel doesn't.</p>
          </div>
          <div className="landing-auth" ref={authRef}>
            <AuthCard {...authProps} />
          </div>
        </div>
      </section>

      {/* ── Section 2: Problem Statement ── */}
      <section className="landing-section landing-problem">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32" className="landing-problem-icon">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <h2>Every nutrition app assumes you eat 60% carbs.</h2>
        <p>Fat-adapted athletes run on 85% fat. Your app should know that.</p>
      </section>

      {/* ── Section 3: How It Works ── */}
      <section className="landing-section landing-steps-section">
        <h2>How It Works</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <span className="landing-step-num">1</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M16 14l-4 4-2-2" strokeWidth="2"/>
            </svg>
            <h3>Connect your calendar</h3>
            <p>Link your Athletica.ai training plan. FastFuel reads your workouts for the week.</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-num">2</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
              <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
              <circle cx="18" cy="8" r="2" fill="currentColor" strokeWidth="0"/>
              <circle cx="12" cy="3" r="1.5" fill="currentColor" strokeWidth="0"/>
            </svg>
            <h3>Auto-detect intensity</h3>
            <p>Each workout maps to Athletica's 7-zone model. Rest, endurance, threshold, VO2max — each gets different fuel.</p>
          </div>
          <div className="landing-step">
            <span className="landing-step-num">3</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a10 10 0 010 20" fill="rgba(254,0,164,0.3)" stroke="none"/>
              <path d="M12 2a10 10 0 000 20" fill="rgba(4,59,177,0.3)" stroke="none"/>
              <line x1="12" y1="2" x2="12" y2="22"/>
            </svg>
            <h3>Get your macros</h3>
            <p>Fat-adapted baseline (85% fat) every day. Extra training carbs only when intensity demands it.</p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Feature Grid ── */}
      <section className="landing-section landing-features-section">
        <h2>Built for Fat-Adapted Athletes</h2>
        <div className="landing-grid">
          <div className="landing-grid-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <h3>Periodized Fuel Timing</h3>
            <p>5-window fuel timing: 4-24h pre, &gt;1h pre, during early, during later, and post-workout. Right fuel at the right time.</p>
          </div>
          <div className="landing-grid-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <h3>7-Zone Auto-Detection</h3>
            <p><a href="https://athletica.ai" target="_blank" rel="noopener noreferrer" className="landing-card-link">Athletica.ai's</a> zone model classifies every workout. Your macros shift automatically from Z1 rest to Z7 sprint.</p>
          </div>
          <div className="landing-grid-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>
            <h3>Fat-Adapted Baseline</h3>
            <p>Daily macros stay at 85% fat / 15% carb. Extra training carbs only for HIT sessions — never wasted on easy days.</p>
          </div>
          <div className="landing-grid-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <h3>Race Calendar & Periodization</h3>
            <p>A/B/C race priority. Nutrition periodizes with your training phase — base, build, peak, taper.</p>
          </div>
          <div className="landing-grid-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            <h3>Smart Meal Logging</h3>
            <p>Barcode scanner, voice input, <a href="https://www.fatsecret.com" target="_blank" rel="noopener noreferrer" className="landing-card-link">FatSecret</a> food database. Log meals in seconds, not minutes.</p>
          </div>
          <div className="landing-grid-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <h3>Weekly Compliance</h3>
            <p>See how closely you hit your targets. Track macro compliance, mood, sleep, and training across blocks.</p>
          </div>
        </div>
      </section>

      {/* ── Section 5: The Science ── */}
      <section className="landing-section landing-method-section">
        <div className="landing-method">
          <h3>The Science of Metabolic Flexibility</h3>
          <p>Elite WorldTour cycling teams like Jumbo-Visma proved that fat-adapted athletes don't avoid carbs — they periodize them. Burn fat at low intensities, shift to carbohydrates as intensity increases, and maximize overall metabolic efficiency.</p>
        </div>
        <div className="landing-science-grid">
          <div className="landing-science-card">
            <h4>Periodized Nutrition</h4>
            <p>Carbs aren't restricted year-round. They're manipulated based on training load — lower intake during base training, higher intake during competition.</p>
          </div>
          <div className="landing-science-card">
            <h4>Train Low, Compete High</h4>
            <p>Low-to-moderate intensity sessions on low carbs force the body to rely on fat. High-intensity and race days get the carbs they need.</p>
          </div>
          <div className="landing-science-card">
            <h4>Low-Carb Endurance</h4>
            <p>For endurance sessions longer than two hours, athletes may consume less than 30g of carbs per hour to enhance fat oxidation.</p>
          </div>
          <div className="landing-science-card">
            <h4>Metabolic Flexibility</h4>
            <p>The goal: train the body to burn fat at lower intensities and shift to carbohydrates as intensity increases — maximizing efficiency across all zones.</p>
          </div>
        </div>
      </section>

      {/* ── Section 6: Bottom CTA ── */}
      <section className="landing-section landing-cta">
        <h2>Stop guessing your macros.</h2>
        <p>Connect your training plan. Let the science handle the rest.</p>
        <button className="landing-cta-btn" onClick={scrollToAuth}>Get Started</button>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="sb-logo" style={{ width: 28, height: 28 }}>
              <svg viewBox="0 0 192 192" width="16" height="16"><path d="M108 28L68 100h28L80 164l52-80h-30z" fill="#fff"/></svg>
            </span>
            <span>FastFuel</span>
          </div>
          <nav className="landing-footer-links">
            <button onClick={() => setFooterPage("terms")}>Terms & Conditions</button>
            <button onClick={() => setFooterPage("privacy")}>Privacy</button>
            <button onClick={() => setFooterPage("methodology")}>Resources</button>
          </nav>
          <div className="landing-footer-copy">&copy; {new Date().getFullYear()} FastFuel. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

