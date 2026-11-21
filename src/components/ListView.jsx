import { useMemo } from "react";
import { useStore } from "../context/contexts";
import { PRIORITIES, addDays, dueState, formatDue, todayISO } from "../lib/utils";

const GROUPS = [
  { id: "overdue", label: "⚠️ En retard" },
  { id: "today", label: "☀️ Aujourd'hui" },
  { id: "tomorrow", label: "🌅 Demain" },
  { id: "week", label: "📆 7 prochains jours" },
  { id: "later", label: "🔭 Plus tard" },
  { id: "none", label: "∞ Sans date" },
  { id: "done", label: "✅ Terminées" },
];

const ListView = ({ tasks, onOpen, showProject, focusMap }) => {
  const { kindOf, projectsById, columnsFor, toggleDone, updateTask } = useStore();

  const groups = useMemo(() => {
    const today = todayISO();
    const tomorrow = addDays(today, 1);
    const week = addDays(today, 7);
    const map = Object.fromEntries(GROUPS.map((g) => [g.id, []]));
    tasks.forEach((t) => {
      if (kindOf(t) === "done") map.done.push(t);
      else if (!t.due_date) map.none.push(t);
      else if (t.due_date < today) map.overdue.push(t);
      else if (t.due_date === today) map.today.push(t);
      else if (t.due_date === tomorrow) map.tomorrow.push(t);
      else if (t.due_date <= week) map.week.push(t);
      else map.later.push(t);
    });
    Object.values(map).forEach((list) =>
      list.sort(
        (a, b) =>
          (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || b.priority - a.priority || a.position - b.position,
      ),
    );
    map.done.sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
    return map;
  }, [tasks, kindOf]);

  if (tasks.length === 0) return null;

  return (
    <div className="list-view">
      {GROUPS.filter((g) => groups[g.id].length).map((g) => (
        <section key={g.id} className={`list-group list-group--${g.id}`}>
          <h3>
            {g.label} <span className="muted">{groups[g.id].length}</span>
          </h3>
          <ul>
            {groups[g.id].map((task) => {
              const done = g.id === "done";
              const project = task.project_id ? projectsById.get(task.project_id) : null;
              return (
                <li key={task.id} className={`row prio-${task.priority}${done ? " is-done" : ""}${focusMap?.[task.id] ? " is-focus" : ""}`}>
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
