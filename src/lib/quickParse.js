// Saisie rapide en langage naturel :
//   "Appeler Paul demain !1 #Client @tel ~court"
//   → titre "Appeler Paul", échéance demain, priorité urgente, projet "Client", étiquette "tel",
//     horizon court terme (~long / ~lt pour long terme, ~court / ~ct pour court terme)
import { addDays, todayISO, toISODate } from "./utils";

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const nextWeekday = (index) => {
  const now = new Date();
  const diff = (index - now.getDay() + 7) % 7 || 7;
  return toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff));
};

export const parseQuickTask = (raw, projects = []) => {
  let text = ` ${raw} `;
  const result = { due_date: undefined, priority: undefined, project_id: undefined, horizon: undefined, labels: [] };

  const take = (regex, handler) => {
    text = text.replace(regex, (...args) => {
      const keep = handler(...args);
      return keep === false ? args[0] : " ";
    });
  };

  // Priorité : !1 (urgente) … !3 (basse)
  take(/\s!([1-3])(?=\s)/g, (_m, n) => {
    result.priority = 4 - Number(n);
  });

  // Projet : #nom (préfixe, insensible aux accents)
  take(/\s#([^\s#@!]+)(?=\s)/g, (_m, name) => {
    const target = normalize(name);
    const project = projects.find((p) => normalize(p.name).replace(/\s+/g, "").startsWith(target));
    if (!project) return false;
    result.project_id = project.id;
  });

  // Horizon : ~long / ~lt  ·  ~court / ~ct
  take(/\s~(long|lt|l)(?=\s)/gi, () => {
    result.horizon = "long";
  });
  take(/\s~(court|ct|c)(?=\s)/gi, () => {
    result.horizon = "short";
  });

  // Étiquettes : @mot
  take(/\s@([^\s#@!]+)(?=\s)/g, (_m, label) => {
    const value = label.toLowerCase().slice(0, 24);
    if (!result.labels.includes(value)) result.labels.push(value);
  });

  // Dates
  take(/\s(aujourd'hui|auj)(?=\s)/gi, () => {
    result.due_date = todayISO();
  });
  take(/\s(après-demain|apres-demain)(?=\s)/gi, () => {
    result.due_date = addDays(todayISO(), 2);
  });
  take(/\sdemain(?=\s)/gi, () => {
    result.due_date = addDays(todayISO(), 1);
  });
  take(/\s(sans date|nodate)(?=\s)/gi, () => {
    result.due_date = null;
  });
  take(/\s(?:dans\s)?(\d{1,2})\s?j(?:ours?)?(?=\s)/gi, (_m, n) => {
    result.due_date = addDays(todayISO(), Number(n));
  });
  take(/\s(?:semaine prochaine)(?=\s)/gi, () => {
    result.due_date = addDays(todayISO(), 7);
  });
  take(/\s(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?=\s)/gi, (_m, day) => {
    result.due_date = nextWeekday(WEEKDAYS.indexOf(day.toLowerCase()));
  });
  take(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/g, (_m, d, m, y) => {
    const now = new Date();
    let year = y ? Number(y.length === 2 ? `20${y}` : y) : now.getFullYear();
    let date = new Date(year, Number(m) - 1, Number(d));
    if (!y && toISODate(date) < todayISO()) date = new Date(++year, Number(m) - 1, Number(d));
    result.due_date = toISODate(date);
  });

  result.title = text.replace(/\s+/g, " ").trim();
  return result;
};
