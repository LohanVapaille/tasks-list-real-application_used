import { uid } from "./utils";

// ── Horizon : court terme (actions rapides) / long terme (objectifs de fond) ──
export const HORIZONS = [
  { value: "short", label: "Court terme", icon: "⚡", hint: "Action rapide, à boucler vite" },
  { value: "long", label: "Long terme", icon: "🔭", hint: "Objectif de fond, sur plusieurs semaines" },
];
export const HORIZON_BY_VALUE = Object.fromEntries(HORIZONS.map((h) => [h.value, h]));

// Les anciennes tâches (avant l'ajout du champ) sont considérées « court terme »,
// sauf celles qui portaient l'étiquette « long terme » de la v1.
export const horizonOf = (task) => {
  if (task.horizon === "long" || task.horizon === "short") return task.horizon;
  return task.labels?.includes("long terme") ? "long" : "short";
};

// Tâche vide avec toutes les valeurs par défaut.
export const newTask = (fields = {}) => ({
  id: uid(),
  project_id: null,
  title: "",
  description: "",
  status: "todo",
  priority: 0,
  horizon: "short",
  due_date: null,
  labels: [],
  checklist: [],
  position: -Date.now(),
  time_spent: 0,
  timer_started_at: null,
  completed_at: null,
  created_at: new Date().toISOString(),
  ...fields,
});

// ── Tri ─────────────────────────────────────────────────────
export const SORTS = [
  { value: "manual", label: "Ordre manuel" },
  { value: "due", label: "Échéance" },
  { value: "priority", label: "Priorité" },
  { value: "horizon", label: "Court → long terme" },
  { value: "label", label: "Étiquette" },
  { value: "created", label: "Plus récentes" },
  { value: "alpha", label: "A → Z" },
];

const byDue = (a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
const byPriority = (a, b) => b.priority - a.priority;
const byPosition = (a, b) => a.position - b.position;
const byHorizon = (a, b) => (horizonOf(a) === horizonOf(b) ? 0 : horizonOf(a) === "short" ? -1 : 1);
const firstLabel = (t) => [...t.labels].sort()[0] ?? "￿";

const COMPARATORS = {
  manual: [byPosition],
  due: [byDue, byPriority, byPosition],
  priority: [byPriority, byDue, byPosition],
  horizon: [byHorizon, byDue, byPriority, byPosition],
  label: [(a, b) => firstLabel(a).localeCompare(firstLabel(b), "fr"), byDue, byPosition],
  created: [(a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""), byPosition],
  alpha: [(a, b) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" }), byPosition],
};

export const compareTasks = (sort) => {
  const chain = COMPARATORS[sort] ?? COMPARATORS.manual;
  return (a, b) => {
    for (const cmp of chain) {
      const r = cmp(a, b);
      if (r) return r;
    }
    return 0;
  };
};

// Regroupement de la vue liste.
export const GROUP_BY = [
  { value: "date", label: "📅 Échéance" },
  { value: "horizon", label: "⚡ Horizon" },
  { value: "label", label: "🏷️ Étiquette" },
];

// ── Étiquettes ──────────────────────────────────────────────
// Couleur stable par étiquette (même nom → même couleur partout).
const LABEL_HUES = [205, 168, 262, 330, 28, 140, 190, 290, 10, 48];
export const labelColor = (label) => {
  let h = 0;
  for (const ch of label) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${LABEL_HUES[h % LABEL_HUES.length]} 60% 45%)`;
};

export const normalizeLabel = (raw) => raw.trim().replace(/^[#@]/, "").toLowerCase().slice(0, 24);
