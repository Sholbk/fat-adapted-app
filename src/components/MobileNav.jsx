import { NAV_ITEMS } from "./Sidebar.jsx";

const MOBILE_LABELS = { log: "Log", weekly: "Weekly", meals: "Meals", recipes: "Recipes", settings: "Settings" };
const MOBILE_ITEMS = NAV_ITEMS.filter(n => n.key !== "phase");

export default function MobileNav({ page, setPage }) {
  return (
    <div className="mobile-nav">
      <nav>
        {MOBILE_ITEMS.map(({ key, icon }) => (
          <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}>
            {icon}
            {MOBILE_LABELS[key] || key}
          </button>
        ))}
      </nav>
    </div>
  );
}
