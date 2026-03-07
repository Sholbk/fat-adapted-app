export function classifyWorkout(summary) {
  const s = summary.toLowerCase();
  if (s.includes("hiit") || s.includes("vo2") || s.includes("interval")) return "vo2max";
  if (s.includes("threshold") || s.includes("strength endurance") || s.includes("se ")) return "threshold";
  if (s.includes("tempo")) return "upperTempo";
  if (s.includes("aerobic") || s.includes("steady") || s.includes("development")) return "endurance";
  if (s.includes("strength") || s.includes("weight training") || s.includes("conditioning") || s.includes("s&c") || s.includes("gym")) return "endurance";
  if (s.includes("run off the bike") || s.includes("rob")) return "upperTempo";
  return "endurance";
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
    const t = classifyWorkout(w.summary);
    if (pri.indexOf(t) < pri.indexOf(best)) best = t;
  }
  return best;
}
