// Periodized fuel timing — 5-window model
// fuel: { pre24h, pre1h, duringEarly, duringLater, post }
export const SESSION_CONFIG = {
  rest: {
    label: "Rest Day", zone: "—", color: "#999", target: "Recovery & repair",
    proteinGkg: 1.6, fatRatio: 0.87, calMul: 1.0,
    fuel: { pre24h: "Protein, healthy fats, low CHO", pre1h: "N/A", duringEarly: "N/A", duringLater: "N/A", post: "Protein" },
    fuelTarget: "Recovery",
    note: "Keep carbs low. Prioritize protein and healthy fats for recovery.",
  },
  endurance: {
    label: "Endurance", zone: "Z1–Z2", color: "#10bc10", target: "LIT — Build aerobic capacity & fat oxidation",
    proteinGkg: 1.8, fatRatio: 0.82, calMul: 1.15,
    fuel: { pre24h: "Protein, healthy fats, low CHO", pre1h: "Protein, healthy fats", duringEarly: "Fat-based fuels, electrolytes", duringLater: "CHO post ~120 min", post: "Protein" },
    fuelTarget: "Increase fat oxidation",
    note: "Restrict carbs to maximize fat oxidation. CHO only after ~2 hours.",
  },
  lowerTempo: {
    label: "Tempo", zone: "Z3a", color: "#e8c010", target: "MIT — Tempo / sweet spot",
    proteinGkg: 1.8, fatRatio: 0.78, calMul: 1.2,
    fuel: { pre24h: "Protein, healthy fats, low CHO", pre1h: "Protein, healthy fats", duringEarly: "Fat-based fuels, electrolytes", duringLater: "CHO post ~90 min", post: "Protein" },
    fuelTarget: "Increase fat oxidation, sustain intensity",
    note: "Fat-fueled early, introduce CHO after ~90 min.",
  },
  upperTempo: {
    label: "Tempo+", zone: "Z3b", color: "#e87010", target: "MIT — Upper tempo",
    proteinGkg: 2.0, fatRatio: 0.70, calMul: 1.3,
    fuel: { pre24h: "Protein, healthy fats, low-to-moderate CHO", pre1h: "Protein, healthy fats, CHO", duringEarly: "Fat-based fuels, electrolytes", duringLater: "CHO post ~60 min", post: "Protein" },
    fuelTarget: "Increase fat oxidation, sustain intensity",
    note: "Low-to-moderate carbs pre. Add CHO after ~60 min.",
  },
  threshold: {
    label: "Threshold", zone: "Z4", color: "#e85040", target: "HIT — Threshold / CP / CS",
    proteinGkg: 2.0, fatRatio: 0.55, calMul: 1.4,
    fuel: { pre24h: "Protein, healthy fats, moderate CHO", pre1h: "Protein, CHO", duringEarly: "CHO, electrolytes, caffeine", duringLater: "CHO post ~30 min", post: "CHO, Protein" },
    fuelTarget: "Sustain intensity",
    note: "Fuel this session. CHO + electrolytes + caffeine during.",
  },
  vo2max: {
    label: "VO2max", zone: "Z5–Z6", color: "#cc0050", target: "HIT — Long & short intervals",
    proteinGkg: 2.2, fatRatio: 0.45, calMul: 1.5,
    fuel: { pre24h: "CHO, Protein", pre1h: "Protein, CHO", duringEarly: "Electrolytes, caffeine", duringLater: "CHO post ~20 min", post: "CHO, Protein" },
    fuelTarget: "Maximise work rate",
    note: "Full glycogen. Fuel for max output.",
  },
  anaerobic: {
    label: "Sprint", zone: "Z7", color: "#800030", target: "HIT — Repeated sprints / SIT",
    proteinGkg: 2.2, fatRatio: 0.45, calMul: 1.5,
    fuel: { pre24h: "CHO, Protein", pre1h: "Protein, CHO", duringEarly: "Electrolytes, caffeine", duringLater: "CHO post ~20 min", post: "CHO, Protein" },
    fuelTarget: "Maximise work rate",
    note: "Full carb support for short maximal efforts.",
  },
};

// Daily (non-training) macros are ALWAYS fat-adapted baseline.
// Extra carbs for intensity are ONLY in training fuel (calcFuelRec).
const BASE_FAT_RATIO = 0.85; // 85% fat / 15% carb split on remaining cals
const BASE_PROTEIN_GKG = 2.0; // FASTER study LC athletes: 2.1 g/kg avg

// EPOC bonus: HIT sessions increase post-exercise metabolic rate & fat oxidation.
// Bonus is applied to TDEE so the athlete eats enough to cover elevated recovery metabolism.
const EPOC_BONUS = {
  rest: 0, endurance: 0, lowerTempo: 0,
  upperTempo: 0.03,  // +3% TDEE
  threshold: 0.05,   // +5% TDEE
  vo2max: 0.08,      // +8% TDEE
  anaerobic: 0.10,   // +10% TDEE
};

// Phase-based modifiers for periodized nutrition (NIH research).
// fatRatioAdj: added to BASE_FAT_RATIO. trainCarbMul: scales TRAIN_CARB_GKG.
export const PHASE_CONFIG = {
  transition:  { fatRatioAdj: 0,     trainCarbMul: 0.8, calAdj: -150, proteinMul: 1.05, label: "Recovery Phase",           tip: "Lower calories, adequate protein for tissue repair. Focus on nutrient-dense foods." },
  preparation: { fatRatioAdj: +0.03, trainCarbMul: 0.8, calAdj: 0,    proteinMul: 1.0,  label: "Preparation Phase",        tip: "Building foundation. Keep carbs low, maximize fat adaptation." },
  base1:       { fatRatioAdj: +0.03, trainCarbMul: 0.9, calAdj: 0,    proteinMul: 1.0,  label: "Base 1 — Train Low",       tip: "Restrict carbs to maximize fat oxidation. High fat, moderate protein." },
  base2:       { fatRatioAdj: +0.02, trainCarbMul: 0.9, calAdj: 0,    proteinMul: 1.0,  label: "Base 2 — Train Low",       tip: "Continued fat adaptation. Volume increasing, keep carbs low." },
  base3:       { fatRatioAdj: +0.01, trainCarbMul: 1.0, calAdj: 0,    proteinMul: 1.0,  label: "Base 3 — Peak Volume",     tip: "Highest volume week. Baseline carb allowance returns." },
  build1:      { fatRatioAdj: -0.05, trainCarbMul: 1.2, calAdj: 0,    proteinMul: 1.0,  label: "Build 1 — Fuel the Work",  tip: "Intensity rising. More carbs around hard sessions." },
  build2:      { fatRatioAdj: -0.07, trainCarbMul: 1.3, calAdj: 0,    proteinMul: 1.0,  label: "Build 2 — Fuel the Work",  tip: "Peak intensity. Increased carb support for race-pace efforts." },
  peak:        { fatRatioAdj: -0.10, trainCarbMul: 1.5, calAdj: 0,    proteinMul: 1.0,  label: "Peak — Train the Gut",     tip: "Practice race-day nutrition. High carbs around key sessions." },
  race:        { fatRatioAdj: -0.10, trainCarbMul: 1.5, calAdj: 0,    proteinMul: 1.0,  label: "Race Week",                tip: "Glycogen loading. Race-day fueling protocol." },
};

// Calculate current Friel phase based on weeks out from A race
export function calcPhaseFromARace(raceDate) {
  if (!raceDate) return null;
  const now = new Date();
  const race = new Date(raceDate + "T12:00");
  const diffMs = race - now;
  const weeksOut = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
  if (weeksOut < 0) return "transition";
  if (weeksOut <= 1) return "race";
  if (weeksOut <= 3) return "peak";
  if (weeksOut <= 7) return "build2";
  if (weeksOut <= 11) return "build1";
  if (weeksOut <= 15) return "base3";
  if (weeksOut <= 19) return "base2";
  if (weeksOut <= 23) return "base1";
  if (weeksOut <= 26) return "preparation";
  return "transition";
}

export function calcMacros(type, lbs, heightIn, age, calAdj, gender, phase) {
  const kg = Math.max((lbs || 150) / 2.205, 1);
  const heightCm = Math.max((heightIn || 67) * 2.54, 1);
  const safeAge = Math.max(age || 30, 1);
  const bmr = 10 * kg + 6.25 * heightCm - 5 * safeAge + (gender === "male" ? 5 : -161);
  const epoc = EPOC_BONUS[type] || 0;
  const pc = phase ? (PHASE_CONFIG[phase] || {}) : {};
  const tdee = Math.max(bmr * 1.55 * (1 + epoc) + (calAdj || 0) + (pc.calAdj || 0), 0);
  const p = Math.round(BASE_PROTEIN_GKG * (pc.proteinMul || 1) * kg);
  const remaining = Math.max(tdee - p * 4, 0);
  const fatRatio = Math.min(Math.max(BASE_FAT_RATIO + (pc.fatRatioAdj || 0), 0.5), 0.95);
  const fat = Math.round(remaining * fatRatio / 9);
  const carbs = Math.round(remaining * (1 - fatRatio) / 4);
  return { cal: Math.round(tdee), fat, protein: p, carbs };
}

// Training fuel carbs are EXTRA — based on session intensity (g/kg).
// These are ON TOP of the fat-adapted daily macros, not pulled from them.
const TRAIN_CARB_GKG = {
  rest: 0, endurance: 0, lowerTempo: 0,
  upperTempo: 0.5,   // small CHO top-up for upper tempo
  threshold: 1.0,    // moderate CHO for threshold work
  vo2max: 1.5,       // full CHO support for VO2max intervals
  anaerobic: 1.5,    // full CHO support for sprints
};

export function calcFuelRec(sType, session, weightLbs, phase) {
  const kg = weightLbs / 2.205;
  if (sType === "rest") {
    const zero = { carbs: 0, protein: 0, fat: 0 };
    return { pre: zero, during: zero, post: zero };
  }
  const pc = phase ? (PHASE_CONFIG[phase] || {}) : {};
  const trainCarb = Math.round((TRAIN_CARB_GKG[sType] || 0) * kg * (pc.trainCarbMul || 1));
  const trainPro = Math.round(session.proteinGkg * kg * 0.25);

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
  // threshold, vo2max, anaerobic — elevated post-exercise fat oxidation (EPOC)
  return {
    pre: { carbs: Math.round(trainCarb * 0.3), protein: Math.round(trainPro * 0.4), fat: 5 },
    during: { carbs: Math.round(trainCarb * 0.45), protein: 0, fat: 0 },
    post: { carbs: Math.round(trainCarb * 0.25), protein: Math.round(trainPro * 0.6), fat: 15 },
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
