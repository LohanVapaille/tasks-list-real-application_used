import { memo } from "react";
import { HORIZON_BY_VALUE, horizonOf, labelColor } from "../lib/tasks";
import { PRIORITIES, dueState, formatDue } from "../lib/utils";

// Carte de tâche (purement visuelle : le glisser-déposer est géré par Board).
const TaskCard = memo(function TaskCard({ task, project, done, showProject, focus, onOpen, onToggle, onLabel, activeLabel, overlay }) {
  const checklistDone = task.checklist.filter((i) => i.done).length;
  const due = dueState(task.due_date, done);
  const horizon = HORIZON_BY_VALUE[horizonOf(task)];

  return (
    <div
      className={`card prio-${task.priority} horizon-${horizon.value}${done ? " is-done" : ""}${focus ? " is-focus" : ""}${overlay ? " is-overlay" : ""}`}
      onClick={() => onOpen?.(task)}
      onKeyDown={(e) => e.key === "Enter" && onOpen?.(task)}
      tabIndex={0}
      role="button"
      aria-label={`Ouvrir ${task.title}`}
    >
      <div className="card-top">
        <button
          className={`check${done ? " checked" : ""}`}
          aria-label={done ? "Marquer comme à faire" : "Marquer comme terminée"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.(task);
          }}
        >
          {done ? "✓" : ""}
        </button>
        <span className="card-title">{task.title}</span>
        {task.priority > 0 && (
          <span className={`prio-flag prio-flag--${task.priority}`} title={`Priorité ${PRIORITIES[task.priority].label}`}>
            {PRIORITIES[task.priority].short}
          </span>
        )}
      </div>

      {focus && <div className="card-focus">✨ {focus}</div>}

      <div className="card-meta">
        <span className={`chip chip-horizon chip-horizon--${horizon.value}`} title={horizon.hint}>
          {horizon.icon} {horizon.label}
        </span>
        {showProject && project && (
          <span className="chip" style={{ "--chip": project.color }}>
            {project.icon} {project.name}
          </span>
        )}
        {task.due_date && <span className={`chip chip-due ${due}`}>📅 {formatDue(task.due_date)}</span>}
        {task.checklist.length > 0 && (
          <span className={`chip${checklistDone === task.checklist.length ? " chip-ok" : ""}`}>
            ☑ {checklistDone}/{task.checklist.length}
          </span>
        )}
        {task.timer_started_at && <span className="chip chip-timer">⏱ en cours</span>}
        {task.description && <span className="chip chip-ghost" title="Contient une description">≡</span>}
        {task.labels.map((l) => (
          <button
            key={l}
            type="button"
            className={`chip chip-label${activeLabel === l ? " is-active" : ""}`}
            style={{ "--chip": labelColor(l) }}
            title={activeLabel === l ? "Retirer le filtre" : `Filtrer sur #${l}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onLabel?.(l);
            }}
          >
            #{l}
          </button>
        ))}
      </div>
    </div>
  );
});

export default TaskCard;
