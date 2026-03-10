const WORKOUT_KEYWORDS = {
  anaerobic: ["sprint", "rst", "sit", "all-out", "all out"],
  vo2max: ["hiit", "vo2", "interval", "30:30", '30"'],
  threshold: ["threshold", "strength endurance", "se ", "ftp"],
  upperTempo: ["tempo", "sweet spot", "run off the bike"],
  endurance: [
    "technique", "tec", "drill",
    "aerobic", "steady", "development", "easy", "recovery",
    "strength", "weight training", "conditioning", "s&c", "gym",
  ],
};

export function classifyWorkout(summary) {
  const s = summary.toLowerCase();
  if (/\brob\b/.test(s)) return "upperTempo";
  for (const [type, keywords] of Object.entries(WORKOUT_KEYWORDS)) {
    if (keywords.some(kw => s.includes(kw))) return type;
  }
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

const SESSION_PRIORITY = ["anaerobic", "vo2max", "threshold", "upperTempo", "lowerTempo", "endurance", "rest"];

export function getSessionTypeFromWorkouts(workouts, load) {
  if (workouts.length === 0) return load > 0 ? getSessionType(load) : "rest";
  let best = "rest";
  for (const w of workouts) {
    const t = w.icu_intensity ? classifyByIntensity(w.icu_intensity) : classifyWorkout(w.summary || w.name || "");
    if (SESSION_PRIORITY.indexOf(t) < SESSION_PRIORITY.indexOf(best)) best = t;
  }
  return best;
}
