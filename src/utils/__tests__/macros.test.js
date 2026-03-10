import { describe, it, expect } from "vitest";
import { calcMacros, calcFuelRec, SESSION_CONFIG, PHASE_CONFIG, calcPhaseFromARace } from "../macros.js";
import {
  classifyWorkout,
  classifyByIntensity,
  getSessionTypeFromWorkouts,
} from "../classification.js";

// ── calcMacros ──────────────────────────────────────────────────────────────

describe("calcMacros", () => {
  it("returns valid numbers for normal inputs (female, rest)", () => {
    const m = calcMacros("rest", 150, 67, 30, 0, "female");
    expect(m.cal).toBeGreaterThan(0);
    expect(m.fat).toBeGreaterThan(0);
    expect(m.protein).toBeGreaterThan(0);
    expect(m.carbs).toBeGreaterThanOrEqual(0);
    for (const v of Object.values(m)) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("returns valid numbers for male", () => {
    const m = calcMacros("rest", 150, 67, 30, 0, "male");
    expect(m.cal).toBeGreaterThan(0);
    expect(m.protein).toBeGreaterThan(0);
    // Male BMR offset (+5) is higher than female (-161)
    const f = calcMacros("rest", 150, 67, 30, 0, "female");
    expect(m.cal).toBeGreaterThan(f.cal);
  });

  it("handles zero weight gracefully (uses default 150)", () => {
    const m = calcMacros("rest", 0, 67, 30, 0, "female");
    const d = calcMacros("rest", 150, 67, 30, 0, "female");
    expect(m.cal).toBe(d.cal);
    expect(m.protein).toBe(d.protein);
  });

  it("handles missing/null inputs without crashing", () => {
    const m = calcMacros(null, null, null, null, null, null);
    expect(Number.isFinite(m.cal)).toBe(true);
    expect(Number.isFinite(m.fat)).toBe(true);
    expect(Number.isFinite(m.protein)).toBe(true);
    expect(Number.isFinite(m.carbs)).toBe(true);
  });

  it("HIT sessions get EPOC bonus calories (rest < vo2max)", () => {
    const args = [150, 67, 30, 0, "female"];
    const rest = calcMacros("rest", ...args);
    const vo2max = calcMacros("vo2max", ...args);
    // VO2max gets +8% EPOC bonus on TDEE
    expect(vo2max.cal).toBeGreaterThan(rest.cal);
    expect(vo2max.fat).toBeGreaterThan(rest.fat);
    // EPOC bonus should be ~5-10% more calories
    const pctDiff = (vo2max.cal - rest.cal) / rest.cal;
    expect(pctDiff).toBeGreaterThan(0.05);
    expect(pctDiff).toBeLessThan(0.15);
  });

  it("LIT sessions have same calories as rest (no EPOC)", () => {
    const args = [150, 67, 30, 0, "female"];
    const rest = calcMacros("rest", ...args);
    const endurance = calcMacros("endurance", ...args);
    expect(rest.cal).toBe(endurance.cal);
    expect(rest.fat).toBe(endurance.fat);
  });

  it("protein is ~2.0 g/kg", () => {
    const m = calcMacros("rest", 150, 67, 30, 0, "male");
    const kg = 150 / 2.205;
    const expectedPro = Math.round(2.0 * kg);
    expect(m.protein).toBe(expectedPro);
  });

  it("calorie adjustment works (negative for weight loss, positive for gain)", () => {
    const base = calcMacros("rest", 150, 67, 30, 0, "female");
    const deficit = calcMacros("rest", 150, 67, 30, -300, "female");
    const surplus = calcMacros("rest", 150, 67, 30, 300, "female");
    expect(deficit.cal).toBeLessThan(base.cal);
    expect(surplus.cal).toBeGreaterThan(base.cal);
  });
});

// ── calcFuelRec ─────────────────────────────────────────────────────────────

describe("calcFuelRec", () => {
  it("rest day returns all zeros", () => {
    const rec = calcFuelRec("rest", SESSION_CONFIG.rest, 150);
    for (const phase of [rec.pre, rec.during, rec.post]) {
      expect(phase.carbs).toBe(0);
      expect(phase.protein).toBe(0);
      expect(phase.fat).toBe(0);
    }
  });

  it("endurance returns zero carbs for pre/during/post", () => {
    const rec = calcFuelRec("endurance", SESSION_CONFIG.endurance, 150);
    expect(rec.pre.carbs).toBe(0);
    expect(rec.during.carbs).toBe(0);
    expect(rec.post.carbs).toBe(0);
  });

  it("threshold returns carbs in during phase", () => {
    const rec = calcFuelRec("threshold", SESSION_CONFIG.threshold, 150);
    expect(rec.during.carbs).toBeGreaterThan(0);
  });

  it("vo2max returns carbs in during phase", () => {
    const rec = calcFuelRec("vo2max", SESSION_CONFIG.vo2max, 150);
    expect(rec.during.carbs).toBeGreaterThan(0);
  });

  it("returns valid numbers, no NaN", () => {
    for (const [key, cfg] of Object.entries(SESSION_CONFIG)) {
      const rec = calcFuelRec(key, cfg, 150);
      for (const phase of [rec.pre, rec.during, rec.post]) {
        for (const v of Object.values(phase)) {
          expect(Number.isNaN(v)).toBe(false);
        }
      }
    }
  });
});

// ── classifyWorkout ─────────────────────────────────────────────────────────

describe("classifyWorkout", () => {
  it('"HIIT intervals" → vo2max', () => {
    expect(classifyWorkout("HIIT intervals")).toBe("vo2max");
  });

  it('"threshold run" → threshold', () => {
    expect(classifyWorkout("threshold run")).toBe("threshold");
  });

  it('"easy aerobic ride" → endurance', () => {
    expect(classifyWorkout("easy aerobic ride")).toBe("endurance");
  });

  it('"tempo run" → upperTempo', () => {
    expect(classifyWorkout("tempo run")).toBe("upperTempo");
  });

  it("unknown string → endurance (default)", () => {
    expect(classifyWorkout("something random")).toBe("endurance");
  });
});

// ── classifyByIntensity ─────────────────────────────────────────────────────

describe("classifyByIntensity", () => {
  it("0 → rest", () => {
    expect(classifyByIntensity(0)).toBe("rest");
  });

  it("50 → endurance (Z1–Z2: <78%)", () => {
    expect(classifyByIntensity(50)).toBe("endurance");
  });

  it("80 → lowerTempo (Z3a: 78–82%)", () => {
    expect(classifyByIntensity(80)).toBe("lowerTempo");
  });

  it("85 → upperTempo (Z3b: 82–88%)", () => {
    expect(classifyByIntensity(85)).toBe("upperTempo");
  });

  it("90 → threshold (Z4: 88–93%)", () => {
    expect(classifyByIntensity(90)).toBe("threshold");
  });

  it("100 → vo2max (Z5–Z6: 93–120% MAP)", () => {
    expect(classifyByIntensity(100)).toBe("vo2max");
  });

  it("125 → anaerobic (Z7: >120% MAP)", () => {
    expect(classifyByIntensity(125)).toBe("anaerobic");
  });
});

// ── getSessionTypeFromWorkouts ──────────────────────────────────────────────

describe("getSessionTypeFromWorkouts", () => {
  it("empty workouts with 0 load → rest", () => {
    expect(getSessionTypeFromWorkouts([], 0)).toBe("rest");
  });

  it("empty workouts with load > 0 → uses load-based classification", () => {
    const result = getSessionTypeFromWorkouts([], 50);
    expect(result).not.toBe("rest");
    // load 50 falls in upperTempo range (41-60)
    expect(result).toBe("upperTempo");
  });

  it("multiple workouts → picks highest intensity", () => {
    const workouts = [
      { summary: "easy aerobic ride" },       // endurance
      { summary: "threshold run" },            // threshold
      { summary: "easy steady ride" },         // endurance
    ];
    expect(getSessionTypeFromWorkouts(workouts, 0)).toBe("threshold");
  });
});

// ── calcMacros with phase ───────────────────────────────────────────────────

describe("calcMacros with phase", () => {
  const args = [150, 67, 30, 0, "female"];

  it("no phase param behaves same as before (backward compatible)", () => {
    const noPhase = calcMacros("rest", ...args);
    const nullPhase = calcMacros("rest", ...args, null);
    expect(noPhase.cal).toBe(nullPhase.cal);
    expect(noPhase.fat).toBe(nullPhase.fat);
  });

  it("base1 phase increases fat ratio (more fat, less carbs)", () => {
    const noPhase = calcMacros("rest", ...args);
    const base1 = calcMacros("rest", ...args, "base1");
    expect(base1.fat).toBeGreaterThanOrEqual(noPhase.fat);
    expect(base1.carbs).toBeLessThanOrEqual(noPhase.carbs);
  });

  it("build2 phase has more carbs than base1", () => {
    const base = calcMacros("rest", ...args, "base1");
    const build = calcMacros("rest", ...args, "build2");
    expect(build.carbs).toBeGreaterThan(base.carbs);
    expect(build.fat).toBeLessThan(base.fat);
  });

  it("transition phase has lower calories (calAdj = -150)", () => {
    const base = calcMacros("rest", ...args, "base1");
    const trans = calcMacros("rest", ...args, "transition");
    expect(trans.cal).toBeLessThan(base.cal);
  });

  it("peak phase shifts fat down, carbs up vs base", () => {
    const base = calcMacros("rest", ...args, "base1");
    const peak = calcMacros("rest", ...args, "peak");
    expect(peak.carbs).toBeGreaterThan(base.carbs);
    expect(peak.fat).toBeLessThan(base.fat);
  });

  it("unknown phase falls back gracefully", () => {
    const m = calcMacros("rest", ...args, "nonexistent");
    expect(Number.isFinite(m.cal)).toBe(true);
  });
});

// ── calcFuelRec with phase ──────────────────────────────────────────────────

describe("calcFuelRec with phase", () => {
  it("build2 increases training carbs vs base1", () => {
    const base = calcFuelRec("threshold", SESSION_CONFIG.threshold, 150, "base1");
    const build = calcFuelRec("threshold", SESSION_CONFIG.threshold, 150, "build2");
    const baseC = base.pre.carbs + base.during.carbs + base.post.carbs;
    const buildC = build.pre.carbs + build.during.carbs + build.post.carbs;
    expect(buildC).toBeGreaterThan(baseC);
  });

  it("rest day is zero carbs regardless of phase", () => {
    const rec = calcFuelRec("rest", SESSION_CONFIG.rest, 150, "peak");
    expect(rec.pre.carbs + rec.during.carbs + rec.post.carbs).toBe(0);
  });

  it("peak phase has more training carbs than base1 for vo2max", () => {
    const base = calcFuelRec("vo2max", SESSION_CONFIG.vo2max, 150, "base1");
    const peak = calcFuelRec("vo2max", SESSION_CONFIG.vo2max, 150, "peak");
    const baseC = base.pre.carbs + base.during.carbs + base.post.carbs;
    const peakC = peak.pre.carbs + peak.during.carbs + peak.post.carbs;
    expect(peakC).toBeGreaterThan(baseC);
  });
});

// ── calcPhaseFromARace ──────────────────────────────────────────────────────

describe("calcPhaseFromARace", () => {
  it("returns null for no race date", () => {
    expect(calcPhaseFromARace(null)).toBeNull();
    expect(calcPhaseFromARace("")).toBeNull();
  });

  it("returns 'transition' for past race date", () => {
    expect(calcPhaseFromARace("2020-01-01")).toBe("transition");
  });
});
