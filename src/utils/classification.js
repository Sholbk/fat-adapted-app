export function classifyWorkout(summary) {
  const s = summary.toLowerCase();
  if (s.includes("sprint") || s.includes("rst") || s.includes("sit") || s.includes("all-out") || s.includes("all out")) return "anaerobic";
  if (s.includes("hiit") || s.includes("vo2") || s.includes("interval") || s.includes("30:30") || s.includes("30\"")) return "vo2max";
  if (s.includes("threshold") || s.includes("strength endurance") || s.includes("se ") || s.includes("ftp")) return "threshold";
  if (s.includes("tempo") || s.includes("sweet spot") || s.includes("run off the bike") || /\brob\b/.test(s)) return "upperTempo";
  if (s.includes("technique") || s.includes("tec") || s.includes("drill")) return "endurance";
  if (s.includes("aerobic") || s.includes("steady") || s.includes("development") || s.includes("easy") || s.includes("recovery")) return "endurance";
  if (s.includes("strength") || s.includes("weight training") || s.includes("conditioning") || s.includes("s&c") || s.includes("gym")) return "endurance";
  return "endurance";
}

export function classifyByIntensity(intensity) {
  if (!intensity || intensity === 0) return "rest";
  if (intensity <= 78) return "endurance";       // Z1–Z2: <78% HRmax (LIT)
  if (intensity <= 82) return "lowerTempo";       // Z3a: 78–82% HRmax (MIT)
  if (intensity <= 88) return "upperTempo";       // Z3b: 82–88% HRmax (MIT)
  if (intensity <= 93) return "threshold";        // Z4: 88–93% HRmax (HIT)
  if (intensity <= 120) return "vo2max";          // Z5–Z6: 93–120% MAP (HIT)
  return "anaerobic";                             // Z7: >120% MAP (HIT)
}

export function getSessionType(load) {
  if (!load || load === 0) return "rest";
  if (load <= 20) return "endurance";
  if (load <= 40) return "lowerTempo";
  if (load <= 60) return "upperTempo";
  if (load <= 85) return "threshold";
  if (load <= 120) return "vo2max";
  return "anaerobic";
}

export function getSessionTypeFromWorkouts(workouts, load) {
  if (workouts.length === 0) return load > 0 ? getSessionType(load) : "rest";
  const pri = ["anaerobic", "vo2max", "threshold", "upperTempo", "lowerTempo", "endurance", "rest"];
  let best = "rest";
  for (const w of workouts) {
    // Intervals.icu events have icu_intensity — use that for more accurate classification
    const t = w.icu_intensity ? classifyByIntensity(w.icu_intensity) : classifyWorkout(w.summary || w.name || "");
    if (pri.indexOf(t) < pri.indexOf(best)) best = t;
  }
  return best;
}
