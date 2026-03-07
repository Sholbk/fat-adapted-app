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

export function sum(entries) {
  return entries.reduce((a, e) => ({
    fat: a.fat + e.fat,
    protein: a.protein + e.protein,
    carbs: a.carbs + e.carbs,
    cal: a.cal + e.fat * 9 + e.protein * 4 + e.carbs * 4,
  }), { fat: 0, protein: 0, carbs: 0, cal: 0 });
}
