import { MEALS, getLog, setLog, getRecipes, saveRecipes, sum } from "../utils/storage.js";
import FoodInput from "../components/FoodInput.jsx";
import Entries from "../components/Entries.jsx";

export default function RecipeBuilder({ date, refresh, showToast, addMeal }) {
  const recipes = getRecipes();

  return (
    <div className="page-content">
      <h2>Recipe Builder</h2>
      <p className="page-sub">Create custom recipes from multiple ingredients. Add them to any meal with one tap.</p>

      <div className="recipe-builder">
        <div className="settings-card">
          <h3>New Recipe</h3>
          <input type="text" className="cloud-input" placeholder="Recipe name (e.g. Morning Smoothie)" id="recipe-name" style={{ marginBottom: "0.5rem" }} />
          <FoodInput onAdd={(entry) => {
            const list = JSON.parse(sessionStorage.getItem("ff-recipe-wip") || "[]");
            list.push(entry);
            sessionStorage.setItem("ff-recipe-wip", JSON.stringify(list));
            refresh();
          }} placeholder="Add ingredient..." />
          <RecipeWIP refresh={refresh} showToast={showToast} />
        </div>
      </div>

      {recipes.length > 0 && <>
        <h3>Saved Recipes</h3>
        <div className="recipe-list">
          {recipes.map(r => (
            <RecipeCard key={r.id} recipe={r} date={date} addMeal={addMeal} refresh={refresh} showToast={showToast} />
          ))}
        </div>
      </>}
    </div>
  );
}

function RecipeWIP({ refresh, showToast }) {
  const wip = JSON.parse(sessionStorage.getItem("ff-recipe-wip") || "[]");
  if (wip.length === 0) return <p className="meal-empty">Add ingredients above to build your recipe</p>;
  const totals = sum(wip);

  return (
    <>
      <Entries items={wip} onRemove={(id) => {
        const list = JSON.parse(sessionStorage.getItem("ff-recipe-wip") || "[]").filter(e => e.id !== id);
        sessionStorage.setItem("ff-recipe-wip", JSON.stringify(list));
        refresh();
      }} />
      <div className="meal-sum">{totals.cal} kcal — F:{totals.fat}g P:{totals.protein}g C:{totals.carbs}g</div>
      <button className="use-plan-btn" onClick={() => {
        const nameEl = document.getElementById("recipe-name");
        const name = nameEl?.value?.trim();
        if (!name) { showToast("Enter a recipe name"); return; }
        const ingredients = JSON.parse(sessionStorage.getItem("ff-recipe-wip") || "[]");
        const totals = sum(ingredients);
        const recipe = { id: Date.now(), name, ingredients, fat: totals.fat, protein: totals.protein, carbs: totals.carbs };
        saveRecipes([...getRecipes(), recipe]);
        sessionStorage.removeItem("ff-recipe-wip");
        if (nameEl) nameEl.value = "";
        refresh();
        showToast(`Recipe "${name}" saved`);
      }}>Save Recipe</button>
    </>
  );
}

function RecipeCard({ recipe: r, date, addMeal, refresh, showToast }) {
  const cal = r.fat * 9 + r.protein * 4 + r.carbs * 4;
  return (
    <div className="recipe-card">
      <div className="recipe-head">
        <strong>{r.name}</strong>
        <span className="recipe-macros">{cal} kcal — F:{r.fat}g P:{r.protein}g C:{r.carbs}g</span>
      </div>
      <div className="recipe-ingredients">
        {r.ingredients.map((ing, i) => <span key={i}>{ing.name}</span>)}
      </div>
      <div className="recipe-actions">
        <select className="recipe-meal-select" id={`recipe-meal-${r.id}`}>
          {MEALS.map(m => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
        </select>
        <button className="copy-meals-btn" onClick={() => {
          const meal = document.getElementById(`recipe-meal-${r.id}`)?.value || "breakfast";
          const entry = { id: Date.now(), name: r.name, fat: r.fat, protein: r.protein, carbs: r.carbs };
          addMeal(meal, entry);
          showToast(`Added "${r.name}" to ${meal}`);
        }}>Add to Meal</button>
        <button className="water-btn water-undo" onClick={() => {
          saveRecipes(getRecipes().filter(x => x.id !== r.id));
          refresh();
          showToast(`Deleted "${r.name}"`);
        }}>Delete</button>
      </div>
    </div>
  );
}
