import { fmt } from "./parsing.js";
import { MEALS, getLog, getTLog, sum, getMood, getNotes } from "./storage.js";
import { getSessionTypeFromWorkouts } from "./classification.js";
import { calcMacros } from "./macros.js";

function getWeekDates(currentDate) {
  const dates = [];
  const d = new Date(currentDate + "T00:00:00");
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(d);
    dd.setDate(d.getDate() - i);
    dates.push(fmt(dd));
  }
  return dates;
}

function getDayTotals(date) {
  const mealEntries = MEALS.flatMap(m => getLog(date, m));
  const trainEntries = getTLog(date);
  return sum([...mealEntries, ...trainEntries]);
}

function buildWeekData(date, planned, wellness, settings) {
  const weekDates = getWeekDates(date);
  const W = settings.goalWeight > 0 ? settings.goalWeight : settings.weight;

  return weekDates.map(d => {
    const consumed = getDayTotals(d);
    const wd = wellness.find(w => w.id === d) || {};
    const load = wd.atlLoad ?? wd.ctlLoad ?? 0;
    const dWorkouts = planned.filter(w => w.date === d);
    const sType = getSessionTypeFromWorkouts(dWorkouts, load);
    const target = calcMacros(sType, W, settings.height, settings.age, 0, settings.gender);

    const entry = { date: d, consumed, target, sessionType: sType };
    const mood = getMood(d);
    if (mood) entry.mood = mood;
    const notes = getNotes(d);
    if (notes) entry.notes = notes.slice(0, 200);
    if (wd.sleepSecs > 0) entry.sleep = `${Math.floor(wd.sleepSecs / 3600)}h${Math.round((wd.sleepSecs % 3600) / 60)}m`;
    if (wd.sleepScore > 0) entry.sleepScore = wd.sleepScore;
    if (wd.hrv > 0) entry.hrv = wd.hrv;
    if (wd.restingHR > 0) entry.restingHR = wd.restingHR;
    if (load > 0) entry.load = Math.round(load);
    return entry;
  });
}

export async function fetchCoachReply(date, planned, wellness, settings, chatMessages) {
  const url = import.meta.env.DEV ? "/.netlify/functions/ai-coach" : "/.netlify/functions/ai-coach";
  const W = settings.goalWeight > 0 ? settings.goalWeight : settings.weight;
  const currentMacros = calcMacros("rest", W, settings.height, settings.age, 0, settings.gender);

  // First message: include full week data for context
  // Follow-up messages: only send conversation history (context is in the first message)
  const isFirstMessage = !chatMessages || chatMessages.length === 0;

  const payload = { settings: { weight: settings.weight, height: settings.height, age: settings.age, gender: settings.gender } };

  if (isFirstMessage) {
    payload.weekData = buildWeekData(date, planned, wellness, settings);
    payload.currentMacros = currentMacros;
  } else {
    payload.messages = chatMessages;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "AI coach request failed");
  }

  return await res.json();
}
