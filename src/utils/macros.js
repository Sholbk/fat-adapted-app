export const SESSION_CONFIG = {
  rest: { label: "Rest Day", zone: "—", color: "#999", target: "Recovery & repair", proteinGkg: 1.6, fatRatio: 0.87, calMul: 1.0, fuel: { pre: "Protein, healthy fats, low CHO", during: "N/A", post: "Protein" }, note: "Keep carbs low. Prioritize protein and healthy fats for recovery." },
  endurance: { label: "Endurance", zone: "Z1–Z2", color: "#10bc10", target: "LIT — Build aerobic capacity & fat oxidation", proteinGkg: 1.8, fatRatio: 0.82, calMul: 1.15, fuel: { pre: "Protein, healthy fats — restrict CHO", during: "Fat-based fuels, electrolytes. CHO only after ~120 min", post: "Protein" }, note: "Restrict carbs to maximize fat oxidation. CHO only after ~2 hours." },
  lowerTempo: { label: "Tempo", zone: "Z3a", color: "#e8c010", target: "MIT — Tempo / sweet spot", proteinGkg: 1.8, fatRatio: 0.78, calMul: 1.2, fuel: { pre: "Protein, healthy fats — low CHO", during: "Fat-based fuels, electrolytes. CHO after ~90 min", post: "Protein" }, note: "Fat-fueled early, introduce CHO after ~90 min." },
  upperTempo: { label: "Tempo+", zone: "Z3b", color: "#e87010", target: "MIT — Upper tempo", proteinGkg: 2.0, fatRatio: 0.70, calMul: 1.3, fuel: { pre: "Protein, healthy fats, moderate CHO", during: "Fat-based early, CHO after ~60 min", post: "Protein" }, note: "Low-to-moderate carbs pre. Add CHO after ~60 min." },
  threshold: { label: "Threshold", zone: "Z4", color: "#e85040", target: "HIT — Threshold / CP / CS", proteinGkg: 2.0, fatRatio: 0.55, calMul: 1.4, fuel: { pre: "Protein, moderate CHO", during: "CHO, electrolytes, caffeine from ~30 min", post: "CHO + Protein" }, note: "Fuel this session. CHO + electrolytes + caffeine during." },
  vo2max: { label: "VO2max", zone: "Z5–Z6", color: "#cc0050", target: "HIT — Long & short intervals", proteinGkg: 2.2, fatRatio: 0.45, calMul: 1.5, fuel: { pre: "CHO + Protein — top up glycogen", during: "Electrolytes, caffeine. CHO from ~20 min", post: "CHO + Protein" }, note: "Full glycogen. AMPK not blunted here — fuel for max output." },
  anaerobic: { label: "Sprint", zone: "Z7", color: "#800030", target: "HIT — Repeated sprints / SIT", proteinGkg: 2.2, fatRatio: 0.45, calMul: 1.5, fuel: { pre: "CHO + Protein", during: "Electrolytes, caffeine from ~20 min", post: "CHO + Protein" }, note: "Full carb support for short maximal efforts." },
};

export function calcMacros(type, lbs, heightIn, age, calAdj, gender) {
  const kg = Math.max((lbs || 150) / 2.205, 1);
  const s = SESSION_CONFIG[type] || SESSION_CONFIG.rest;
  const heightCm = Math.max((heightIn || 67) * 2.54, 1);
  const safeAge = Math.max(age || 30, 1);
  const bmr = 10 * kg + 6.25 * heightCm - 5 * safeAge + (gender === "male" ? 5 : -161);
  const tdee = Math.max(bmr * 1.55 * s.calMul + (calAdj || 0), 0);
  const p = Math.round(s.proteinGkg * kg);
  const remaining = Math.max(tdee - p * 4, 0);
  const fat = Math.round(remaining * s.fatRatio / 9);
  const carbs = Math.round(remaining * (1 - s.fatRatio) / 4);
  return { cal: Math.round(tdee), fat, protein: p, carbs };
}

export function calcFuelRec(sType, session, weightLbs, dailyMacros) {
  const kg = weightLbs / 2.205;
  if (sType === "rest") {
    const zero = { carbs: 0, protein: 0, fat: 0 };
    return { pre: zero, during: zero, post: zero };
  }
  const totalCarb = dailyMacros ? dailyMacros.carbs : Math.round(kg * (1 - session.fatRatio) * 2);
  const totalPro = Math.round(session.proteinGkg * kg);
  // ~40% of daily carbs as training fuel (pre 30%, during 40%, post 30%)
  const trainCarb = Math.round(totalCarb * 0.4);
  const trainPro = Math.round(totalPro * 0.25);

  if (["endurance", "lowerTempo"].includes(sType)) {
    return {
      pre: { carbs: 0, protein: Math.round(trainPro * 0.4), fat: 15 },
      during: { carbs: 0, protein: 0, fat: 15 },
      post: { carbs: 0, protein: Math.round(trainPro * 0.6), fat: 5 },
    };
  }
  if (sType === "upperTempo") {
    return {
      pre: { carbs: Math.round(trainCarb * 0.3), protein: Math.round(trainPro * 0.4), fat: 10 },
      during: { carbs: Math.round(trainCarb * 0.7), protein: 0, fat: 5 },
      post: { carbs: 0, protein: Math.round(trainPro * 0.6), fat: 5 },
    };
  }
  // threshold, vo2max, anaerobic
  return {
    pre: { carbs: Math.round(trainCarb * 0.3), protein: Math.round(trainPro * 0.4), fat: 5 },
    during: { carbs: Math.round(trainCarb * 0.45), protein: 0, fat: 0 },
    post: { carbs: Math.round(trainCarb * 0.25), protein: Math.round(trainPro * 0.6), fat: 5 },
  };
}

export function sumFuelRec(fuelRec) {
  const total = {
    carbs: fuelRec.pre.carbs + fuelRec.during.carbs + fuelRec.post.carbs,
    protein: fuelRec.pre.protein + fuelRec.during.protein + fuelRec.post.protein,
    fat: fuelRec.pre.fat + fuelRec.during.fat + fuelRec.post.fat,
  };
  total.cal = total.carbs * 4 + total.protein * 4 + total.fat * 9;
  return total;
}
