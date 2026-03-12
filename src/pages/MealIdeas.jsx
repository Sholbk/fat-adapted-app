import { useState, useEffect } from "react";
import { MEALS, getLog, setLog } from "../utils/storage.js";
import { fmt } from "../utils/parsing.js";

// ── Large pool of meal options per slot ──
// Each slot has many options; the app picks one per slot based on date + shuffle
const BREAKFASTS = [
  { label: "Classic Eggs & Salmon", foods: [
    { name: "Eggs (3) cooked in butter", f: 21, p: 18, c: 2 },
    { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
    { name: "Smoked salmon (3 oz)", f: 4, p: 16, c: 0 },
    { name: "Coffee with MCT oil", f: 14, p: 0, c: 0 },
  ]},
  { label: "Greek Omelet", foods: [
    { name: "Greek omelet (3 eggs, feta, spinach)", f: 22, p: 22, c: 3 },
    { name: "Bacon (3 slices)", f: 14, p: 9, c: 0 },
    { name: "Sliced tomato with olive oil", f: 7, p: 1, c: 4 },
    { name: "Bulletproof coffee", f: 14, p: 0, c: 0 },
  ]},
  { label: "Sausage & Eggs", foods: [
    { name: "Sausage patties (2)", f: 22, p: 14, c: 1 },
    { name: "Scrambled eggs (3) with cheddar", f: 20, p: 22, c: 2 },
    { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
    { name: "Coffee with heavy cream", f: 10, p: 0, c: 1 },
  ]},
  { label: "Smoked Trout Plate", foods: [
    { name: "Smoked trout (4 oz) on cucumber rounds", f: 8, p: 24, c: 2 },
    { name: "Cream cheese (2 tbsp)", f: 10, p: 2, c: 1 },
    { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
    { name: "Matcha latte with coconut cream", f: 14, p: 1, c: 2 },
  ]},
  { label: "Egg Muffin Cups", foods: [
    { name: "Egg muffins (3) with spinach & cheese", f: 18, p: 21, c: 2 },
    { name: "Turkey sausage links (2)", f: 8, p: 14, c: 2 },
    { name: "Coconut oil coffee", f: 14, p: 0, c: 0 },
    { name: "Berries (1/4 cup) with whipped cream", f: 6, p: 1, c: 5 },
  ]},
  { label: "Chia & Prosciutto", foods: [
    { name: "Chia pudding (2 tbsp chia, coconut cream)", f: 18, p: 5, c: 6 },
    { name: "Hard-boiled eggs (3)", f: 15, p: 18, c: 0 },
    { name: "Prosciutto (2 oz)", f: 8, p: 14, c: 0 },
    { name: "Coffee with MCT oil", f: 14, p: 0, c: 0 },
  ]},
  { label: "Eggs Benedict Keto", foods: [
    { name: "Eggs Benedict on portobello caps (2)", f: 24, p: 20, c: 4 },
    { name: "Hollandaise sauce (2 tbsp)", f: 12, p: 1, c: 0 },
    { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
    { name: "Bulletproof coffee", f: 14, p: 0, c: 0 },
  ]},
  { label: "Chorizo Scramble", foods: [
    { name: "Chorizo (3 oz) crumbled", f: 20, p: 14, c: 2 },
    { name: "Scrambled eggs (3)", f: 15, p: 18, c: 1 },
    { name: "Sour cream (2 tbsp)", f: 6, p: 1, c: 1 },
    { name: "Sliced jalapeños & cilantro", f: 0, p: 0, c: 2 },
    { name: "Coffee with coconut cream", f: 12, p: 0, c: 1 },
  ]},
  { label: "Lox Plate", foods: [
    { name: "Smoked salmon (4 oz)", f: 6, p: 22, c: 0 },
    { name: "Cream cheese (2 tbsp)", f: 10, p: 2, c: 1 },
    { name: "Capers & red onion", f: 0, p: 0, c: 2 },
    { name: "Cucumber slices", f: 0, p: 0, c: 2 },
    { name: "Bulletproof coffee", f: 14, p: 0, c: 0 },
    { name: "Macadamia nuts (1 oz)", f: 22, p: 2, c: 4 },
  ]},
  { label: "Coconut Pancakes", foods: [
    { name: "Coconut flour pancakes (3) with butter", f: 22, p: 12, c: 6 },
    { name: "Sugar-free maple syrup (2 tbsp)", f: 0, p: 0, c: 1 },
    { name: "Bacon (4 slices)", f: 18, p: 12, c: 0 },
    { name: "Coffee with heavy cream", f: 10, p: 0, c: 1 },
  ]},
  { label: "Mediterranean Morning", foods: [
    { name: "Shakshuka (2 eggs in tomato sauce)", f: 14, p: 14, c: 8 },
    { name: "Feta cheese (1 oz)", f: 6, p: 4, c: 1 },
    { name: "Olive oil drizzle (1 tbsp)", f: 14, p: 0, c: 0 },
    { name: "Turkey sausage (2 links)", f: 8, p: 14, c: 2 },
    { name: "Coffee with MCT oil", f: 14, p: 0, c: 0 },
  ]},
  { label: "Steak & Eggs", foods: [
    { name: "Flank steak (4 oz) pan-seared", f: 10, p: 28, c: 0 },
    { name: "Fried eggs (2) in butter", f: 16, p: 12, c: 0 },
    { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
    { name: "Bulletproof coffee", f: 14, p: 0, c: 0 },
  ]},
];

const LUNCHES = [
  { label: "Chicken Thigh Salad", foods: [
    { name: "Grilled chicken thighs (6 oz)", f: 14, p: 42, c: 0 },
    { name: "Mixed greens with olive oil (2 tbsp)", f: 28, p: 2, c: 4 },
    { name: "Almonds (1 oz)", f: 14, p: 6, c: 3 },
    { name: "Cheese (1 oz)", f: 9, p: 7, c: 0 },
  ]},
  { label: "Tuna Salad Plate", foods: [
    { name: "Tuna salad (6 oz) with mayo", f: 22, p: 40, c: 2 },
    { name: "Celery sticks (4)", f: 0, p: 1, c: 3 },
    { name: "Walnuts (1 oz)", f: 18, p: 4, c: 4 },
    { name: "Cucumber slices with cream cheese", f: 10, p: 2, c: 3 },
  ]},
  { label: "Lettuce Wrap Burger", foods: [
    { name: "Lettuce-wrap burger (6 oz patty)", f: 18, p: 36, c: 1 },
    { name: "Swiss cheese (1 slice)", f: 8, p: 8, c: 0 },
    { name: "Pickle spears (3)", f: 0, p: 0, c: 2 },
    { name: "Side of coleslaw with olive oil dressing", f: 18, p: 2, c: 6 },
  ]},
  { label: "Chicken Caesar", foods: [
    { name: "Chicken Caesar salad (6 oz grilled chicken)", f: 14, p: 42, c: 4 },
    { name: "Parmesan crisps (1 oz)", f: 8, p: 10, c: 1 },
    { name: "Olive oil & lemon dressing (2 tbsp)", f: 28, p: 0, c: 1 },
  ]},
  { label: "Garlic Butter Shrimp", foods: [
    { name: "Shrimp (6 oz) sautéed in garlic butter", f: 18, p: 36, c: 2 },
    { name: "Zucchini noodles with pesto (2 tbsp)", f: 18, p: 3, c: 3 },
    { name: "Cherry tomatoes (1/2 cup)", f: 0, p: 1, c: 4 },
    { name: "Feta cheese (1 oz)", f: 6, p: 4, c: 1 },
  ]},
  { label: "Cobb Salad", foods: [
    { name: "Cobb salad (chicken, bacon, egg, avocado)", f: 32, p: 38, c: 6 },
    { name: "Blue cheese dressing (2 tbsp)", f: 16, p: 1, c: 1 },
    { name: "Sunflower seeds (1 oz)", f: 14, p: 6, c: 4 },
  ]},
  { label: "Thai Coconut Soup", foods: [
    { name: "Thai coconut soup with chicken (6 oz)", f: 22, p: 36, c: 6 },
    { name: "Bean sprouts & cilantro garnish", f: 0, p: 2, c: 3 },
    { name: "Lime wedge & fish sauce", f: 0, p: 1, c: 1 },
    { name: "Macadamia nuts (1 oz)", f: 22, p: 2, c: 4 },
  ]},
  { label: "Antipasto Plate", foods: [
    { name: "Salami (2 oz)", f: 16, p: 10, c: 1 },
    { name: "Fresh mozzarella (2 oz)", f: 12, p: 12, c: 1 },
    { name: "Marinated artichoke hearts (1/2 cup)", f: 10, p: 2, c: 4 },
    { name: "Olives (10)", f: 5, p: 0, c: 2 },
    { name: "Olive oil drizzle (1 tbsp)", f: 14, p: 0, c: 0 },
    { name: "Prosciutto (1 oz)", f: 4, p: 7, c: 0 },
  ]},
  { label: "Salmon Avocado Bowl", foods: [
    { name: "Salmon (5 oz) grilled", f: 14, p: 34, c: 0 },
    { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
    { name: "Sesame seeds (1 tbsp)", f: 5, p: 2, c: 1 },
    { name: "Cucumber & radish salad with rice vinegar", f: 0, p: 1, c: 3 },
    { name: "Mayo-sriracha drizzle (1 tbsp)", f: 10, p: 0, c: 1 },
  ]},
  { label: "BLT Lettuce Wraps", foods: [
    { name: "Bacon (5 slices)", f: 22, p: 15, c: 0 },
    { name: "Romaine lettuce wraps (4 leaves)", f: 0, p: 1, c: 2 },
    { name: "Sliced tomato", f: 0, p: 1, c: 3 },
    { name: "Mayo (2 tbsp)", f: 22, p: 0, c: 0 },
    { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
  ]},
  { label: "Pulled Pork Bowl", foods: [
    { name: "Pulled pork (6 oz) sugar-free BBQ", f: 16, p: 40, c: 4 },
    { name: "Coleslaw with olive oil mayo", f: 16, p: 1, c: 4 },
    { name: "Pickled jalapeños", f: 0, p: 0, c: 1 },
    { name: "Cheddar cheese (1 oz)", f: 9, p: 7, c: 0 },
  ]},
  { label: "Greek Chicken Bowl", foods: [
    { name: "Grilled chicken breast (5 oz)", f: 4, p: 38, c: 0 },
    { name: "Tzatziki sauce (3 tbsp)", f: 6, p: 2, c: 3 },
    { name: "Cucumber & tomato salad with olive oil", f: 14, p: 1, c: 4 },
    { name: "Kalamata olives (10)", f: 8, p: 1, c: 2 },
    { name: "Feta cheese (1 oz)", f: 6, p: 4, c: 1 },
  ]},
];

const DINNERS = [
  { label: "Ribeye Night", foods: [
    { name: "Grass-fed ribeye steak (8 oz)", f: 28, p: 50, c: 0 },
    { name: "Roasted broccoli with coconut oil", f: 14, p: 4, c: 8 },
    { name: "Side salad with olive oil", f: 14, p: 2, c: 3 },
    { name: "Bone broth (1 cup)", f: 1, p: 10, c: 1 },
  ]},
  { label: "Herb Butter Salmon", foods: [
    { name: "Baked salmon (6 oz) with herb butter", f: 24, p: 40, c: 0 },
    { name: "Sautéed asparagus in ghee", f: 12, p: 4, c: 4 },
    { name: "Cauliflower mash with butter", f: 10, p: 3, c: 6 },
    { name: "Side Caesar salad (no croutons)", f: 14, p: 3, c: 3 },
  ]},
  { label: "Butter Pork Chops", foods: [
    { name: "Pork chops (6 oz) pan-fried in butter", f: 20, p: 42, c: 0 },
    { name: "Roasted Brussels sprouts with bacon", f: 16, p: 6, c: 6 },
    { name: "Sautéed mushrooms in garlic butter", f: 12, p: 3, c: 4 },
    { name: "Mixed green salad with ranch", f: 14, p: 1, c: 3 },
  ]},
  { label: "Mediterranean Lamb", foods: [
    { name: "Lamb chops (6 oz)", f: 22, p: 38, c: 0 },
    { name: "Roasted zucchini with olive oil", f: 14, p: 2, c: 4 },
    { name: "Tahini drizzle (1 tbsp)", f: 8, p: 3, c: 3 },
    { name: "Greek salad (no pita)", f: 12, p: 4, c: 6 },
  ]},
  { label: "Roasted Duck", foods: [
    { name: "Roasted duck breast (6 oz)", f: 16, p: 40, c: 0 },
    { name: "Braised red cabbage with butter", f: 10, p: 2, c: 6 },
    { name: "Mashed turnips with cream", f: 8, p: 2, c: 5 },
    { name: "Arugula salad with lemon vinaigrette", f: 14, p: 1, c: 3 },
  ]},
  { label: "Coconut Curry Mahi", foods: [
    { name: "Mahi-mahi (6 oz) pan-seared in coconut oil", f: 16, p: 42, c: 0 },
    { name: "Coconut curry sauce (1/4 cup)", f: 12, p: 1, c: 4 },
    { name: "Steamed bok choy with sesame oil", f: 8, p: 3, c: 3 },
    { name: "Cauliflower rice (1 cup)", f: 5, p: 2, c: 5 },
  ]},
  { label: "NY Strip & Spinach", foods: [
    { name: "Grilled NY strip steak (8 oz)", f: 22, p: 50, c: 0 },
    { name: "Creamed spinach", f: 14, p: 4, c: 4 },
    { name: "Roasted radishes with butter", f: 8, p: 1, c: 4 },
    { name: "Bone broth (1 cup)", f: 1, p: 10, c: 1 },
  ]},
  { label: "Chicken Thigh Skillet", foods: [
    { name: "Chicken thighs (6 oz) crispy skin", f: 18, p: 40, c: 0 },
    { name: "Roasted peppers & onions in olive oil", f: 14, p: 1, c: 6 },
    { name: "Guacamole (1/4 cup)", f: 12, p: 1, c: 4 },
    { name: "Sour cream (2 tbsp)", f: 6, p: 1, c: 1 },
    { name: "Shredded cheese (1 oz)", f: 9, p: 7, c: 0 },
  ]},
  { label: "Tuscan Shrimp", foods: [
    { name: "Shrimp (6 oz) in garlic cream sauce", f: 22, p: 36, c: 3 },
    { name: "Sun-dried tomatoes (2 tbsp)", f: 2, p: 1, c: 3 },
    { name: "Wilted spinach with olive oil", f: 14, p: 3, c: 2 },
    { name: "Parmesan cheese (1 oz)", f: 7, p: 10, c: 1 },
  ]},
  { label: "Bunless Bison Burger", foods: [
    { name: "Bison burger patty (8 oz)", f: 14, p: 48, c: 0 },
    { name: "Bacon (2 slices)", f: 10, p: 6, c: 0 },
    { name: "Cheddar cheese (1 oz)", f: 9, p: 7, c: 0 },
    { name: "Avocado (1/2)", f: 15, p: 2, c: 6 },
    { name: "Side salad with ranch", f: 14, p: 1, c: 3 },
  ]},
  { label: "Lemon Herb Chicken", foods: [
    { name: "Roasted whole chicken leg (bone-in)", f: 16, p: 38, c: 0 },
    { name: "Lemon butter sauce (2 tbsp)", f: 14, p: 0, c: 1 },
    { name: "Roasted fennel with olive oil", f: 10, p: 1, c: 5 },
    { name: "Steamed green beans with almonds", f: 10, p: 4, c: 6 },
  ]},
  { label: "Korean Beef Bowl", foods: [
    { name: "Ground beef (6 oz) with coconut aminos", f: 18, p: 38, c: 4 },
    { name: "Sesame oil drizzle (1 tbsp)", f: 14, p: 0, c: 0 },
    { name: "Cauliflower rice (1 cup)", f: 5, p: 2, c: 5 },
    { name: "Kimchi (1/4 cup)", f: 0, p: 1, c: 2 },
    { name: "Fried egg (1)", f: 7, p: 6, c: 0 },
  ]},
];

const SNACKS = [
  { label: "Nuts & Cheese", foods: [
    { name: "Macadamia nuts (1.5 oz)", f: 32, p: 3, c: 4 },
    { name: "String cheese (2)", f: 12, p: 14, c: 2 },
    { name: "Olives (10)", f: 5, p: 0, c: 2 },
  ]},
  { label: "Pork Rinds & Guac", foods: [
    { name: "Pork rinds (1 oz)", f: 9, p: 17, c: 0 },
    { name: "Guacamole (1/4 cup)", f: 12, p: 1, c: 4 },
    { name: "Dark chocolate (1 oz, 85%)", f: 12, p: 2, c: 7 },
  ]},
  { label: "Pepperoni & Pecans", foods: [
    { name: "Pepperoni slices (1 oz)", f: 12, p: 6, c: 1 },
    { name: "Cream cheese stuffed celery (3)", f: 10, p: 2, c: 3 },
    { name: "Pecans (1 oz)", f: 20, p: 3, c: 4 },
  ]},
  { label: "Brie & Berries", foods: [
    { name: "Brie cheese (1.5 oz)", f: 14, p: 9, c: 0 },
    { name: "Almonds (1 oz)", f: 14, p: 6, c: 3 },
    { name: "Blackberries (1/4 cup)", f: 0, p: 1, c: 5 },
  ]},
  { label: "Trail Mix", foods: [
    { name: "Smoked almonds (1.5 oz)", f: 22, p: 9, c: 4 },
    { name: "Beef jerky (1 oz)", f: 3, p: 13, c: 3 },
    { name: "Coconut chips (1 oz)", f: 12, p: 1, c: 5 },
  ]},
  { label: "Gouda & Marcona", foods: [
    { name: "Gouda cheese (1.5 oz)", f: 12, p: 11, c: 1 },
    { name: "Marcona almonds (1 oz)", f: 16, p: 5, c: 3 },
    { name: "Olives (10)", f: 5, p: 0, c: 2 },
  ]},
  { label: "Prosciutto Wraps", foods: [
    { name: "Prosciutto-wrapped mozzarella (2 pieces)", f: 14, p: 14, c: 1 },
    { name: "Pistachios (1 oz)", f: 13, p: 6, c: 5 },
    { name: "Dark chocolate (1 oz, 85%)", f: 12, p: 2, c: 7 },
  ]},
  { label: "Avocado Boats", foods: [
    { name: "Avocado (1/2) with everything seasoning", f: 15, p: 2, c: 6 },
    { name: "Sardines (1 tin)", f: 8, p: 14, c: 0 },
    { name: "Walnuts (1 oz)", f: 18, p: 4, c: 4 },
  ]},
  { label: "Cheese & Meat Board", foods: [
    { name: "Cheddar cheese cubes (1.5 oz)", f: 14, p: 10, c: 0 },
    { name: "Salami slices (1 oz)", f: 10, p: 6, c: 0 },
    { name: "Cucumber rounds", f: 0, p: 0, c: 2 },
    { name: "Ranch dip (2 tbsp)", f: 14, p: 1, c: 1 },
  ]},
  { label: "Fat Bomb Plate", foods: [
    { name: "Chocolate fat bomb (2)", f: 22, p: 2, c: 4 },
    { name: "Almond butter (1 tbsp)", f: 9, p: 4, c: 3 },
    { name: "Celery sticks (3)", f: 0, p: 0, c: 2 },
    { name: "Cashews (1 oz)", f: 12, p: 5, c: 8 },
  ]},
];

const ALL_POOLS = [BREAKFASTS, LUNCHES, DINNERS, SNACKS];
const SLOT_NAMES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const MEAL_NAMES = ["breakfast", "lunch", "dinner", "snack"];
const DIST_PCTS = [
  { meal: "Breakfast", pct: 0.25 },
  { meal: "Lunch", pct: 0.30 },
  { meal: "Dinner", pct: 0.30 },
  { meal: "Snack", pct: 0.15 },
];

// Deterministic pick based on date string — same date always gets the same default
function dateHash(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = ((h << 5) - h + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickForDate(date, shuffleOffset = 0) {
  const h = dateHash(date);
  return ALL_POOLS.map((pool, i) => {
    const idx = (h + i * 7 + shuffleOffset) % pool.length;
    return { meal: SLOT_NAMES[i], ...pool[idx] };
  });
}

const SHUFFLE_KEY = "ff-meal-shuffle";

function getSavedShuffle(date) {
  try {
    const saved = JSON.parse(localStorage.getItem(SHUFFLE_KEY));
    if (saved && saved.date === date) return saved.offset;
  } catch { /* ignore */ }
  return 0;
}

function saveShuffle(date, offset) {
  localStorage.setItem(SHUFFLE_KEY, JSON.stringify({ date, offset }));
}


const CATEGORIES = {
  "Proteins": ["egg", "salmon", "chicken", "steak", "ribeye", "turkey", "sausage", "beef", "fish", "tuna", "pork", "shrimp", "lamb", "duck", "bison", "venison", "prawn", "crab", "lobster", "sardine", "mackerel", "trout", "cod", "mahi", "chorizo", "prosciutto", "salami", "pepperoni", "bacon", "jerky"],
  "Dairy": ["cheese", "yogurt", "butter", "parmesan", "cream", "milk", "mozzarella", "feta", "gouda", "brie", "ricotta", "ghee", "sour cream", "crème", "hollandaise", "cheddar", "swiss", "tzatziki"],
  "Produce": ["avocado", "greens", "broccoli", "salad", "vegetables", "veggies", "sweet potato", "banana", "berries", "olive", "orange", "tomato", "onion", "lettuce", "spinach", "kale", "zucchini", "mushroom", "pepper", "cucumber", "asparagus", "cauliflower", "cabbage", "radish", "celery", "lime", "lemon", "jalapeño", "cilantro", "basil", "arugula", "fennel", "bok choy", "artichoke", "blackberr", "bean sprout", "kimchi"],
  "Grains & Starches": ["oatmeal", "rice", "quinoa", "bread", "toast", "pasta", "rice cake", "tortilla", "wrap"],
  "Nuts & Seeds": ["almond", "macadamia", "nut butter", "peanut", "walnut", "pecan", "cashew", "pistachio", "hemp", "chia", "flax", "pumpkin seed", "sunflower seed", "tahini", "sesame"],
  "Oils & Fats": ["olive oil", "coconut oil", "mct oil", "avocado oil", "sesame oil", "ghee"],
  "Pantry": ["bone broth", "coffee", "honey", "juice", "cocoa", "coconut milk", "soy sauce", "fish sauce", "curry", "pesto", "mayo", "ranch", "coconut cream", "fat bomb", "coconut aminos", "matcha", "chocolate"],
};

function categorizeItem(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return "Other";
}

function parseFood(foodName) {
  const cleaned = foodName.replace(/\s*(cooked in|scrambled with|scrambled|sautéed in|drizzled with|tossed in|topped with|pan-fried in|pan-seared in|crumbled|crispy skin)\b.*$/i, "").trim();
  const parenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const baseName = parenMatch[1].trim();
    const inside = parenMatch[2].trim();
    const qtyUnit = inside.match(/^([\d.]+(?:\/[\d.]+)?)\s*(.*)$/);
    if (qtyUnit) {
      const num = qtyUnit[1].includes("/") ? qtyUnit[1].split("/").reduce((a, b) => a / b) : parseFloat(qtyUnit[1]);
      const unit = qtyUnit[2].replace(/\s*(cooked|raw)\s*$/i, "").trim();
      return { name: baseName, qty: num, unit: unit || "items" };
    }
    return { name: baseName, qty: 1, unit: "items" };
  }
  return { name: cleaned, qty: 1, unit: "items" };
}

function formatQty(qty, unit) {
  const q = qty % 1 === 0 ? qty.toString() : qty.toFixed(1).replace(/\.0$/, "");
  if (!unit || unit === "items") return q;
  const u = qty > 1 && !unit.endsWith("s") && !unit.endsWith("oz") && !unit.endsWith("tbsp") ? unit + "s" : unit;
  return `${q} ${u}`;
}

function buildShoppingList(plans, days) {
  const items = new Map();
  for (const meal of plans) {
    for (const food of meal.foods) {
      const parsed = parseFood(food.name);
      const key = parsed.name.toLowerCase();
      if (items.has(key)) {
        items.get(key).qty += parsed.qty * days;
      } else {
        items.set(key, { name: parsed.name, qty: parsed.qty * days, unit: parsed.unit });
      }
    }
  }
  const grouped = {};
  for (const [, item] of items) {
    const cat = categorizeItem(item.name);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  return grouped;
}

function printShoppingListPDF(grouped, weekLabel, planType) {
  const w = window.open("", "_blank");
  if (!w) return false;

  const categoryHTML = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, items]) => `
      <div class="category">
        <h2>${cat}</h2>
        ${items.map(item => `
          <div class="item">
            <span class="checkbox"></span>
            <span class="name">${item.name}</span>
            <span class="qty">${formatQty(item.qty, item.unit)}</span>
          </div>
        `).join("")}
      </div>
    `).join("");

  w.document.write(`<!DOCTYPE html>
<html>
<head>
<title>FastFuel Shopping List</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e8ad3; padding-bottom: 16px; }
  .header h1 { font-size: 24px; color: #1a1a2e; margin-bottom: 4px; }
  .header p { font-size: 13px; color: #666; }
  .category { margin-bottom: 20px; break-inside: avoid; }
  .category h2 { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1e8ad3; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; }
  .item { display: flex; align-items: center; gap: 10px; padding: 5px 0; border-bottom: 1px dotted #eee; }
  .checkbox { width: 16px; height: 16px; border: 2px solid #999; border-radius: 3px; flex-shrink: 0; }
  .name { flex: 1; font-size: 14px; }
  .qty { font-size: 13px; color: #666; font-weight: 600; white-space: nowrap; }
  .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 12px; }
  .columns { columns: 2; column-gap: 30px; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
  .print-btn { display: block; margin: 0 auto 24px; padding: 10px 32px; background: #1e8ad3; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .print-btn:hover { background: #1670b0; }
</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Download / Print PDF</button>
  <div class="header">
    <h1>Shopping List</h1>
    <p>${weekLabel} &mdash; ${planType} Plan &mdash; 7 days</p>
  </div>
  <div class="columns">
    ${categoryHTML}
  </div>
  <div class="footer">Generated by FastFuel &mdash; fastfuel.training</div>
</body>
</html>`);
  w.document.close();
  return true;
}


export default function MealIdeas({ date, macros, fuelRecTotal, session, sType, refresh, showToast, setPage }) {
  const mf = macros.fat, mp = macros.protein, mc = macros.carbs, mcal = macros.cal;
  const dist = DIST_PCTS.map(d => ({ ...d, fat: Math.round(mf * d.pct), protein: Math.round(mp * d.pct), carbs: Math.round(mc * d.pct), cal: Math.round(mcal * d.pct) }));

  const [shuffleOffset, setShuffleOffset] = useState(() => getSavedShuffle(date));

  // Reset shuffle when date changes
  useEffect(() => {
    setShuffleOffset(getSavedShuffle(date));
  }, [date]);

  function handleShuffle() {
    const next = shuffleOffset + 1;
    setShuffleOffset(next);
    saveShuffle(date, next);
  }

  const plans = pickForDate(date, shuffleOffset);

  return (
    <div className="page-content">
      <h2>Meal Plan — {new Date(date + "T12:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</h2>
      <p className="page-sub">
        Non-Training Fuel — {mcal} kcal | Fat {mf}g | Protein {mp}g | Carbs {mc}g
      </p>
      <p className="page-sub" style={{ fontSize: "0.75rem", marginTop: "-0.25rem" }}>
        Training carbs are separate — see Training Fuel on the Daily Log.
      </p>

      {/* Shuffle bar */}
      <div className="ai-mood-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="ai-mood-header" style={{ marginBottom: "0.25rem" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
              <span>Shuffle Meals</span>
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--ff-text-muted)", margin: 0 }}>
              {plans.map(p => p.label).join(" · ")}
            </p>
          </div>
          <button className="ai-mood-btn" onClick={handleShuffle}>Shuffle</button>
        </div>
      </div>

      <div className="meal-plan-grid">
        {dist.map((d, i) => {
          const plan = plans[i];
          const totals = plan.foods.reduce((a, f) => ({ f: a.f + f.f, p: a.p + f.p, c: a.c + f.c }), { f: 0, p: 0, c: 0 });
          totals.cal = totals.f * 9 + totals.p * 4 + totals.c * 4;
          return (
            <div key={d.meal} className="meal-plan-card">
              <div className="mp-head">
                <h3>{plan.meal}{plan.label ? <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "var(--ff-text-muted)", marginLeft: "0.5rem" }}>— {plan.label}</span> : null}</h3>
                <span className="mp-target">Target: {d.cal} kcal | F:{d.fat}g P:{d.protein}g C:{d.carbs}g</span>
              </div>
              <div className="mp-foods">
                {plan.foods.map((f, j) => (
                  <div key={j} className="mp-food">
                    <span className="mp-food-name">{f.name}</span>
                    <span className="mp-food-macros">F:{f.f}g P:{f.p}g C:{f.c}g</span>
                  </div>
                ))}
              </div>
              <div className="mp-totals">
                Meal total: {totals.cal} kcal — F:{totals.f}g P:{totals.p}g C:{totals.c}g
              </div>
            </div>
          );
        })}
      </div>
      <div className="mp-actions">
        <button className="use-plan-btn" onClick={() => {
          let added = 0;
          plans.forEach((plan, i) => {
            const meal = MEAL_NAMES[i];
            const existing = getLog(date, meal);
            const entries = plan.foods.map(f => ({
              id: Date.now() + Math.random() + added,
              name: f.name,
              fat: f.f, protein: f.p, carbs: f.c
            }));
            setLog(date, meal, [...existing, ...entries]);
            added += entries.length;
          });
          refresh();
          showToast(`Added ${added} foods from meal plan`);
          setPage("log");
        }}>Use this plan for today</button>
        <button className="shopping-list-btn" onClick={() => {
          const startDate = new Date(date + "T12:00");
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          const weekLabel = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
          const planType = "Fat-Adapted";
          const grouped = buildShoppingList(plans, 7);
          if (!printShoppingListPDF(grouped, weekLabel, planType)) {
            showToast("Please allow pop-ups to generate the shopping list");
          }
        }}>Weekly Shopping List (PDF)</button>
      </div>
      <div className="mp-note">
        <strong>Session note:</strong> {session.note}
      </div>
    </div>
  );
}
