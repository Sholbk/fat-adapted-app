import { useState, useEffect } from "react";
import { getCachedCoach, fetchCoachAdvice, clearCoachCache } from "../utils/aiCoach.js";

const CONFIDENCE_COLORS = { high: "#10bc10", medium: "#e8c010", low: "#999" };

export default function AICoachCard({ date, planned, wellness, settings, calAdj, setCalAdj }) {
  const [advice, setAdvice] = useState(() => getCachedCoach());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ff-ai-applied")) || null; } catch { return null; }
  });

  function applyAdvice(adv) {
    const adj = { calAdj: adv.calAdj || 0, fatAdj: adv.fatAdj || 0, proteinAdj: adv.proteinAdj || 0, carbAdj: adv.carbAdj || 0, reason: adv.reason };
    localStorage.setItem("ff-ai-applied", JSON.stringify(adj));
    setApplied(adj);
    if (setCalAdj) setCalAdj(adv.calAdj || 0);
  }

  function dismissAdvice() {
    localStorage.removeItem("ff-ai-applied");
    setApplied(null);
    if (setCalAdj) setCalAdj(0);
  }

  async function getAdvice() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchCoachAdvice(date, planned, wellness, settings);
      setAdvice(data);
      // Auto-apply
      applyAdvice(data);
    } catch (e) {
      setError(e.message || "Something went wrong");
    }
    setLoading(false);
  }

  // Auto-fetch on mount if no cached advice
  useEffect(() => {
    if (!advice && !loading) {
      getAdvice();
    }
  }, []);

  // Show applied adjustment even if no fresh advice
  if (!advice && !loading && !error) {
    if (applied) {
      return (
        <div className="ai-coach-card ai-coach-applied">
          <div className="ai-coach-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 2a4 4 0 014 4c0 1.5-.8 2.8-2 3.5V11h-4V9.5C8.8 8.8 8 7.5 8 6a4 4 0 014-4z"/><path d="M10 14h4"/><path d="M10 17h4"/><path d="M9 11h6v7a2 2 0 01-2 2h-2a2 2 0 01-2-2v-7z"/></svg>
            <span>AI Coach</span>
          </div>
          <p className="ai-coach-reason">{applied.reason}</p>
          <div className="ai-coach-actions">
            <button className="ai-coach-dismiss" onClick={dismissAdvice}>Dismiss</button>
            <button className="ai-coach-refresh" onClick={getAdvice}>Refresh</button>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="ai-coach-card">
      <div className="ai-coach-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 2a4 4 0 014 4c0 1.5-.8 2.8-2 3.5V11h-4V9.5C8.8 8.8 8 7.5 8 6a4 4 0 014-4z"/><path d="M10 14h4"/><path d="M10 17h4"/><path d="M9 11h6v7a2 2 0 01-2 2h-2a2 2 0 01-2-2v-7z"/></svg>
        <span>AI Coach</span>
        {advice?.confidence && (
          <span className="ai-coach-confidence" style={{ color: CONFIDENCE_COLORS[advice.confidence] || "#999" }}>
            {advice.confidence} confidence
          </span>
        )}
      </div>

      {loading && <p className="ai-coach-loading">Analyzing your last 7 days...</p>}
      {error && <p className="ai-coach-error">{error}</p>}

      {advice && !loading && (
        <>
          <p className="ai-coach-reason">{advice.reason}</p>
          {advice.detail && <p className="ai-coach-detail">{advice.detail}</p>}

          {(advice.calAdj !== 0 || advice.fatAdj !== 0 || advice.proteinAdj !== 0 || advice.carbAdj !== 0) && (
            <div className="ai-coach-adjustments">
              {advice.calAdj !== 0 && <span className="ai-coach-adj">{advice.calAdj > 0 ? "+" : ""}{advice.calAdj} cal</span>}
              {advice.fatAdj !== 0 && <span className="ai-coach-adj" style={{ color: "#fe00a4" }}>{advice.fatAdj > 0 ? "+" : ""}{advice.fatAdj}g fat</span>}
              {advice.proteinAdj !== 0 && <span className="ai-coach-adj" style={{ color: "#043bb1" }}>{advice.proteinAdj > 0 ? "+" : ""}{advice.proteinAdj}g pro</span>}
              {advice.carbAdj !== 0 && <span className="ai-coach-adj" style={{ color: "#10bc10" }}>{advice.carbAdj > 0 ? "+" : ""}{advice.carbAdj}g carbs</span>}
            </div>
          )}

          <div className="ai-coach-actions">
            {applied ? (
              <button className="ai-coach-dismiss" onClick={dismissAdvice}>Dismiss Adjustment</button>
            ) : (
              <button className="ai-coach-apply" onClick={() => applyAdvice(advice)}>Apply</button>
            )}
            <button className="ai-coach-refresh" onClick={() => { clearCoachCache(); getAdvice(); }}>Refresh</button>
          </div>
        </>
      )}
    </div>
  );
}
