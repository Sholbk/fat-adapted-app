import { useState, useEffect, useRef } from "react";
import { fetchCoachReply } from "../utils/aiCoach.js";
import { getCoachChat, saveCoachChat, clearCoachChat } from "../utils/storage.js";

const QUICK_REPLIES = ["Felt great", "Low energy", "Sluggish", "Normal", "GI issues"];

export default function AICoachCard({ date, planned, wellness, settings }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ff-ai-applied")) || null; } catch { return null; }
  });
  const threadRef = useRef(null);
  const prevDateRef = useRef(date);

  // Load chat on mount, clear on date change
  useEffect(() => {
    if (prevDateRef.current !== date) {
      clearCoachChat();
      setMessages([]);
      setApplied(null);
      localStorage.removeItem("ff-ai-applied");
      prevDateRef.current = date;
    } else {
      const saved = getCoachChat();
      if (saved.length > 0) {
        setMessages(saved);
      }
    }
  }, [date]);

  // Auto-fetch initial greeting when no messages
  useEffect(() => {
    if (messages.length === 0 && !loading) {
      sendToCoach(null);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendToCoach(userText) {
    setLoading(true);
    setError("");

    // Build the messages to send to API
    let apiMessages = [];
    const currentMessages = [...messages];

    if (userText) {
      const userMsg = { role: "user", content: userText, ts: Date.now() };
      currentMessages.push(userMsg);
      setMessages(currentMessages);
      saveCoachChat(currentMessages);
    }

    // Build API message array from chat history
    // First message pair includes the data context (handled by backend)
    // Subsequent messages are just the conversation
    if (currentMessages.length > 0) {
      apiMessages = currentMessages.map(m => ({ role: m.role, content: m.content }));
    }

    try {
      const data = await fetchCoachReply(date, planned, wellness, settings, apiMessages.length > 0 ? apiMessages : null);

      const coachMsg = { role: "assistant", content: data.message, ts: Date.now() };
      if (data.adjustment) {
        coachMsg.adjustment = data.adjustment;
      }

      const nextMessages = [...currentMessages, coachMsg];
      setMessages(nextMessages);
      saveCoachChat(nextMessages);
    } catch (e) {
      setError(e.message || "Something went wrong");
    }
    setLoading(false);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    sendToCoach(text);
  }

  function handleQuickReply(text) {
    if (loading) return;
    sendToCoach(text);
  }

  function applyAdjustment(adj) {
    const applied = { calAdj: adj.calAdj || 0, fatAdj: adj.fatAdj || 0, proteinAdj: adj.proteinAdj || 0, carbAdj: adj.carbAdj || 0 };
    localStorage.setItem("ff-ai-applied", JSON.stringify(applied));
    setApplied(applied);
  }

  function dismissAdjustment() {
    localStorage.removeItem("ff-ai-applied");
    setApplied(null);
  }

  function handleReset() {
    clearCoachChat();
    setMessages([]);
    setApplied(null);
    localStorage.removeItem("ff-ai-applied");
    setError("");
    // Re-fetch greeting
    setTimeout(() => sendToCoach(null), 100);
  }

  return (
    <div className="ai-coach-card ai-chat-card">
      <div className="ai-coach-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 2a4 4 0 014 4c0 1.5-.8 2.8-2 3.5V11h-4V9.5C8.8 8.8 8 7.5 8 6a4 4 0 014-4z"/><path d="M10 14h4"/><path d="M10 17h4"/><path d="M9 11h6v7a2 2 0 01-2 2h-2a2 2 0 01-2-2v-7z"/></svg>
        <span>AI Coach</span>
        <button className="ai-chat-reset" onClick={handleReset} title="Start over">New Chat</button>
      </div>

      {/* Message thread */}
      <div className="ai-chat-thread" ref={threadRef}>
        {messages.map((m, i) => (
          <div key={i} className={`ai-chat-msg ai-chat-${m.role}`}>
            <div className="ai-chat-bubble">{m.content}</div>
            {m.adjustment && (
              <div className="ai-chat-adjustment">
                <div className="ai-coach-adjustments">
                  {m.adjustment.calAdj !== 0 && <span className="ai-coach-adj">{m.adjustment.calAdj > 0 ? "+" : ""}{m.adjustment.calAdj} cal</span>}
                  {m.adjustment.fatAdj !== 0 && <span className="ai-coach-adj" style={{ color: "#fe00a4" }}>{m.adjustment.fatAdj > 0 ? "+" : ""}{m.adjustment.fatAdj}g fat</span>}
                  {m.adjustment.proteinAdj !== 0 && <span className="ai-coach-adj" style={{ color: "#043bb1" }}>{m.adjustment.proteinAdj > 0 ? "+" : ""}{m.adjustment.proteinAdj}g pro</span>}
                  {m.adjustment.carbAdj !== 0 && <span className="ai-coach-adj" style={{ color: "#10bc10" }}>{m.adjustment.carbAdj > 0 ? "+" : ""}{m.adjustment.carbAdj}g carbs</span>}
                </div>
                {applied ? (
                  <button className="ai-coach-dismiss" onClick={dismissAdjustment}>Dismiss</button>
                ) : (
                  <button className="ai-coach-apply" onClick={() => applyAdjustment(m.adjustment)}>Apply</button>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="ai-chat-msg ai-chat-assistant">
            <div className="ai-chat-bubble ai-chat-typing">Thinking...</div>
          </div>
        )}
        {error && (
          <div className="ai-chat-msg ai-chat-assistant">
            <div className="ai-chat-bubble ai-chat-error">Collecting Data</div>
          </div>
        )}
      </div>

      {/* Quick replies */}
      <div className="ai-chat-quick">
        {QUICK_REPLIES.map(q => (
          <button key={q} className="ai-chat-quick-btn" onClick={() => handleQuickReply(q)} disabled={loading}>{q}</button>
        ))}
      </div>

      {/* Input */}
      <div className="ai-chat-input-row">
        <input
          type="text"
          className="ai-chat-input"
          placeholder="Tell your coach how you feel..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          disabled={loading}
        />
        <button className="ai-chat-send" onClick={handleSend} disabled={loading || !input.trim()}>Send</button>
      </div>
    </div>
  );
}
