export const MEALS = ["breakfast", "lunch", "dinner", "snack"];

export function getSettings() {
  try { return JSON.parse(localStorage.getItem("ff-settings") || "null"); } catch { return null; }
}

export function saveSettings(s) {
  localStorage.setItem("ff-settings", JSON.stringify(s));
}

export const DEFAULT_SETTINGS = {
  weight: 213,
  startDate: new Date().toISOString().slice(0, 10),
  height: 65,
  age: 35,
  gender: "female",
  goalWeight: 213,
  name: "Stephanie",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  athleticaUrl: "https://app.athletica.ai/4935a810a4/athletica.ics",
  waterTarget: 100,
  darkMode: false,
};

export function getLog(d, m) {
  try { return JSON.parse(localStorage.getItem(`ff-${m}-${d}`) || "[]"); } catch { return []; }
}

export function setLog(d, m, e) {
  localStorage.setItem(`ff-${m}-${d}`, JSON.stringify(e));
}

export function getTLog(d) {
  try { return JSON.parse(localStorage.getItem(`ff-train-${d}`) || "[]"); } catch { return []; }
}

export function setTLog(d, e) {
  localStorage.setItem(`ff-train-${d}`, JSON.stringify(e));
}

export function getWeightLog() {
  try { return JSON.parse(localStorage.getItem("ff-weight-log") || "[]"); } catch { return []; }
}

export function addWeightEntry(date, weight) {
  const log = getWeightLog().filter(e => e.date !== date);
  log.push({ date, weight });
  log.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem("ff-weight-log", JSON.stringify(log));
}

export function getWater(d) {
  try { return JSON.parse(localStorage.getItem(`ff-water-${d}`) || "0"); } catch { return 0; }
}

export function setWater(d, oz) {
  localStorage.setItem(`ff-water-${d}`, JSON.stringify(oz));
}

export function getSupps(d) {
  try { return JSON.parse(localStorage.getItem(`ff-supps-${d}`) || "[]"); } catch { return []; }
}

export function setSupps(d, list) {
  localStorage.setItem(`ff-supps-${d}`, JSON.stringify(list));
}

export const COMMON_SUPPS = [
  "Electrolytes", "MCT Oil", "Creatine", "Magnesium", "Sodium", "Potassium",
  "Fish Oil", "Vitamin D", "Caffeine", "BCAA", "Collagen", "Multivitamin"
];

export function sum(entries) {
  return entries.reduce((a, e) => ({
    fat: a.fat + e.fat,
    protein: a.protein + e.protein,
    carbs: a.carbs + e.carbs,
    cal: a.cal + e.fat * 9 + e.protein * 4 + e.carbs * 4,
  }), { fat: 0, protein: 0, carbs: 0, cal: 0 });
}
