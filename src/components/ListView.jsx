import { useMemo } from "react";
import { useStore } from "../context/contexts";
import { HORIZONS, HORIZON_BY_VALUE, compareTasks, horizonOf, labelColor } from "../lib/tasks";
import { PRIORITIES, addDays, dueState, formatDue, todayISO } from "../lib/utils";

const DATE_GROUPS = [
  { id: "overdue", label: "⚠️ En retard" },
  { id: "today", label: "☀️ Aujourd'hui" },
  { id: "tomorrow", label: "🌅 Demain" },
  { id: "week", label: "📆 7 prochains jours" },
  { id: "later", label: "🔭 Plus tard" },
  { id: "none", label: "∞ Sans date" },
];

const dateGroupOf = (t, today, tomorrow, week) => {
  if (!t.due_date) return "none";
  if (t.due_date < today) return "overdue";
  if (t.due_date === today) return "today";
  if (t.due_date === tomorrow) return "tomorrow";
  if (t.due_date <= week) return "week";
  return "later";
};

// Construit la liste ordonnée des sections [{ id, label, tasks, className, color }].
const buildSections = (tasks, groupBy, kindOf, sort) => {
  const open = [];
  const done = [];
  tasks.forEach((t) => (kindOf(t) === "done" ? done : open).push(t));
  // Sans tri choisi, la liste suit l'échéance puis la priorité.
  const cmp = compareTasks(sort === "manual" ? "due" : sort);
  let sections;

  if (groupBy === "horizon") {
    sections = HORIZONS.map((h) => ({
      id: h.value,
      label: `${h.icon} ${h.label}`,
      hint: h.hint,
      className: `list-group--horizon list-group--${h.value}`,
      tasks: open.filter((t) => horizonOf(t) === h.value),
    }));
  } else if (groupBy === "label") {
    const map = new Map();
    open.forEach((t) => {
      const keys = t.labels.length ? t.labels : [""];
      keys.forEach((l) => {
        if (!map.has(l)) map.set(l, []);
        map.get(l).push(t);
      });
    });
    sections = [...map.keys()]
      .sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "fr")))
      .map((l) => ({
        id: `label:${l}`,
        label: l ? `#${l}` : "Sans étiquette",
        color: l ? labelColor(l) : undefined,
        className: "list-group--label",
        tasks: map.get(l),
      }));
  } else {
    const today = todayISO();
    const tomorrow = addDays(today, 1);
    const week = addDays(today, 7);
    sections = DATE_GROUPS.map((g) => ({
      ...g,
      className: `list-group--${g.id}`,
      tasks: open.filter((t) => dateGroupOf(t, today, tomorrow, week) === g.id),
    }));
  }

  sections.forEach((s) => s.tasks.sort(cmp));
  done.sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
  sections.push({ id: "done", label: "✅ Terminées", className: "list-group--done", tasks: done, isDone: true });
  return sections.filter((s) => s.tasks.length);
};

const ListView = ({ tasks, onOpen, showProject, focusMap, groupBy = "date", sort = "manual", onLabel, activeLabel }) => {
  const { kindOf, projectsById, columnsFor, toggleDone, updateTask } = useStore();

  const sections = useMemo(() => buildSections(tasks, groupBy, kindOf, sort), [tasks, groupBy, kindOf, sort]);

  if (tasks.length === 0) return null;

  return (
    <div className="list-view">
      {sections.map((g) => (
        <section key={g.id} className={`list-group ${g.className}`} style={g.color ? { "--group": g.color } : undefined}>
          <h3>
            {g.label} <span className="muted">{g.tasks.length}</span>
            {g.hint && <span className="muted small list-group-hint"> · {g.hint}</span>}
          </h3>
          <ul>
            {g.tasks.map((task) => {
              const done = g.isDone;
              const project = task.project_id ? projectsById.get(task.project_id) : null;
              const horizon = HORIZON_BY_VALUE[horizonOf(task)];
              return (
                <li
                  key={task.id}
                  className={`row prio-${task.priority} horizon-${horizon.value}${done ? " is-done" : ""}${focusMap?.[task.id] ? " is-focus" : ""}`}
                >
                  <button
                    className={`check${done ? " checked" : ""}`}
                    onClick={() => toggleDone(task)}
                    aria-label={done ? "Marquer comme à faire" : "Marquer comme terminée"}
                  >
                    {done ? "✓" : ""}
                  </button>
                  <button className="row-title" onClick={() => onOpen(task)}>
                    {task.title}
                    {task.checklist.length > 0 && (
                      <span className="muted small"> · ☑ {task.checklist.filter((i) => i.done).length}/{task.checklist.length}</span>
                    )}
                  </button>
                  {groupBy !== "horizon" && (
                    <button
                      type="button"
                      className={`chip chip-horizon chip-horizon--${horizon.value}`}
                      title={`${horizon.label} — cliquer pour basculer`}
                      onClick={() => updateTask(task.id, { horizon: horizon.value === "long" ? "short" : "long" })}
                    >
                      {horizon.icon}
                      <span className="hide-sm"> {horizon.label}</span>
                    </button>
                  )}
                  {task.labels.map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={`chip chip-label hide-sm${activeLabel === l ? " is-active" : ""}`}
                      style={{ "--chip": labelColor(l) }}
                      onClick={() => onLabel?.(l)}
                      title={activeLabel === l ? "Retirer le filtre" : `Filtrer sur #${l}`}
                    >
                      #{l}
                    </button>
                  ))}
                  {showProject && project && (
                    <span className="chip hide-sm" style={{ "--chip": project.color }}>
                      {project.icon} {project.name}
                    </span>
                  )}
                  <select
                    className="row-status hide-sm"
                    value={task.status}
                    onChange={(e) => updateTask(task.id, { status: e.target.value })}
                    aria-label="État"
                  >
                    {columnsFor(task.project_id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {task.priority > 0 && <span className={`prio-flag prio-flag--${task.priority}`}>{PRIORITIES[task.priority].short}</span>}
                  {task.due_date && <span className={`chip chip-due ${dueState(task.due_date, done)}`}>{formatDue(task.due_date)}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default ListView;
