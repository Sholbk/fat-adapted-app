export const MEALS = ["breakfast", "lunch", "dinner", "snack"];

function safeGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}

export function getSettings() { return safeGet("ff-settings", null); }

export function saveSettings(s) {
  localStorage.setItem("ff-settings", JSON.stringify(s));
}

export const DEFAULT_SETTINGS = {
  weight: 150,
  startDate: new Date().toISOString().slice(0, 10),
  height: 67,
  age: 30,
  gender: "female",
  goalWeight: 150,
  name: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  athleticaUrl: "",
  waterTarget: 100,
  darkMode: false,
};

export function getLog(d, m) { return safeGet(`ff-${m}-${d}`, []); }

export function setLog(d, m, e) {
  localStorage.setItem(`ff-${m}-${d}`, JSON.stringify(e));
}

export function getTLog(d) { return safeGet(`ff-train-${d}`, []); }

export function setTLog(d, e) {
  localStorage.setItem(`ff-train-${d}`, JSON.stringify(e));
}

export function getWeightLog() { return safeGet("ff-weight-log", []); }

export function addWeightEntry(date, weight) {
  const log = getWeightLog().filter(e => e.date !== date);
  log.push({ date, weight });
  log.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem("ff-weight-log", JSON.stringify(log));
}

export function getWater(d) { return safeGet(`ff-water-${d}`, 0); }

export function setWater(d, oz) {
  localStorage.setItem(`ff-water-${d}`, JSON.stringify(oz));
}

export function getSupps(d) { return safeGet(`ff-supps-${d}`, []); }

export function setSupps(d, list) {
  localStorage.setItem(`ff-supps-${d}`, JSON.stringify(list));
}

export const COMMON_SUPPS = [
  "Electrolytes", "MCT Oil", "Creatine", "Magnesium", "Sodium", "Potassium",
  "Fish Oil", "Vitamin D", "Caffeine", "BCAA", "Collagen", "Multivitamin"
];

export function getMood(d) {
  return localStorage.getItem(`ff-mood-${d}`) || "";
}

export function setMood(d, mood) {
  localStorage.setItem(`ff-mood-${d}`, mood);
}

export function getNotes(d) {
  return localStorage.getItem(`ff-notes-${d}`) || "";
}

export function setNotes(d, text) {
  localStorage.setItem(`ff-notes-${d}`, text);
}

export function getRecipes() { return safeGet("ff-recipes", []); }

export function saveRecipes(recipes) {
  localStorage.setItem("ff-recipes", JSON.stringify(recipes));
}

export function getFuelTests() { return safeGet("ff-fuel-tests", []); }

export function saveFuelTests(tests) {
  localStorage.setItem("ff-fuel-tests", JSON.stringify(tests));
}

export function sum(entries) {
  return entries.reduce((a, e) => ({
    fat: a.fat + e.fat,
    protein: a.protein + e.protein,
    carbs: a.carbs + e.carbs,
    cal: a.cal + e.fat * 9 + e.protein * 4 + e.carbs * 4,
  }), { fat: 0, protein: 0, carbs: 0, cal: 0 });
}
