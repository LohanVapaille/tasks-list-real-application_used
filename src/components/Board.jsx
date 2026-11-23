import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useStore } from "../context/contexts";
import { compareTasks } from "../lib/tasks";
import { todayISO } from "../lib/utils";
import TaskCard from "./TaskCard";

const DONE_PREVIEW = 15;

const DraggableCard = ({ task, isOver, ...cardProps }) => {
  const drag = useDraggable({ id: task.id });
  const drop = useDroppable({ id: `card:${task.id}` });
  const setRef = (node) => {
    drag.setNodeRef(node);
    drop.setNodeRef(node);
  };
  return (
    <div
      ref={setRef}
      className={`card-slot${drag.isDragging ? " is-dragging" : ""}${isOver ? " drop-before" : ""}`}
      {...drag.attributes}
      {...drag.listeners}
      tabIndex={-1}
    >
      <TaskCard task={task} {...cardProps} />
    </div>
  );
};

const InlineAdd = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  if (!open) {
    return (
      <button className="column-add" onClick={() => setOpen(true)}>
        ＋ Ajouter une tâche
      </button>
    );
  }
  return (
    <form
      className="column-add-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onAdd(value.trim());
        setValue("");
      }}
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => !value && setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="Nom de la tâche + Entrée"
        maxLength={300}
      />
    </form>
  );
};

const Column = ({ column, tasks, overId, cardProps, onInlineAdd, showAll, onShowAll }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${column.key}` });
  const limited = column.kind === "done" && !showAll && tasks.length > DONE_PREVIEW;
  const shown = limited ? tasks.slice(-DONE_PREVIEW) : tasks;

  return (
    <section className={`column kind-${column.kind}${isOver ? " is-over" : ""}`} aria-label={column.name}>
      <header className="column-head">
        <span className="column-dot" aria-hidden="true" />
        <h3>{column.name}</h3>
        <span className="column-count">{tasks.length}</span>
      </header>
      <div ref={setNodeRef} className="column-body">
        {limited && (
          <button className="column-more" onClick={onShowAll}>
            Voir les {tasks.length - DONE_PREVIEW} plus anciennes
          </button>
        )}
        {shown.map((task) => (
          <DraggableCard key={task.id} task={task} isOver={overId === `card:${task.id}`} {...cardProps(task)} />
        ))}
        {tasks.length === 0 && <p className="column-empty">Glisse une tâche ici</p>}
        {onInlineAdd && <InlineAdd onAdd={(title) => onInlineAdd(column, title, tasks)} />}
      </div>
    </section>
  );
};

/**
 * mode "project" : colonnes du projet ; mode "all" : colonnes par type (à faire / en cours / terminé).
 */
const Board = ({ columns, tasks, mode, projectId, onOpen, focusMap, onAddColumn, sort = "manual", onLabel, activeLabel, defaults }) => {
  const { projectsById, columnsFor, kindOf, updateTask, toggleDone, addTask } = useStore();
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [expanded, setExpanded] = useState({});

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const keyOf = useMemo(() => {
    const keys = new Set(columns.map((c) => c.key));
    return (task) => {
      if (mode === "all") return kindOf(task);
      return keys.has(task.status) ? task.status : columns[0].key;
    };
  }, [columns, mode, kindOf]);

  const groups = useMemo(() => {
    const map = new Map(columns.map((c) => [c.key, []]));
    tasks.forEach((t) => map.get(keyOf(t))?.push(t));
    const cmp = compareTasks(sort);
    map.forEach((list) => list.sort(cmp));
    return map;
  }, [columns, tasks, keyOf, sort]);

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const activeTask = activeId ? tasksById.get(activeId) : null;

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    setOverId(null);
    if (!over) return;
    const task = tasksById.get(active.id);
    if (!task) return;

    let targetKey;
    let beforeId = null;
    if (String(over.id).startsWith("card:")) {
      beforeId = String(over.id).slice(5);
      if (beforeId === task.id) return;
      const overTask = tasksById.get(beforeId);
      if (!overTask) return;
      targetKey = keyOf(overTask);
    } else {
      targetKey = String(over.id).slice(4);
    }

    const list = (groups.get(targetKey) ?? []).filter((t) => t.id !== task.id);
    let position;
    if (sort !== "manual") {
      // Tri automatique : on change seulement l'état, l'ordre suit le tri choisi.
      if (targetKey === keyOf(task)) return;
      position = list.length ? Math.max(...list.map((t) => t.position)) + 1 : 0;
    } else if (beforeId) {
      const index = list.findIndex((t) => t.id === beforeId);
      const next = list[index];
      const prev = list[index - 1];
      position = prev ? (prev.position + next.position) / 2 : next.position - 1;
    } else {
      position = list.length ? list[list.length - 1].position + 1 : 0;
    }

    let status = targetKey;
    if (mode === "all") {
      if (kindOf(task) === targetKey) status = task.status;
      else {
        const cols = columnsFor(task.project_id);
        status = (cols.find((c) => c.kind === targetKey) ?? cols[0]).id;
      }
    }
    if (status === task.status && position === task.position) return;
    updateTask(task.id, { status, position });
  };

  const cardProps = (task) => {
    const project = task.project_id ? projectsById.get(task.project_id) : null;
    return {
      project,
      done: kindOf(task) === "done",
      showProject: mode === "all",
      focus: focusMap?.[task.id],
      onOpen,
      onToggle: toggleDone,
      onLabel,
      activeLabel,
    };
  };

  const inlineAdd =
    mode === "all"
      ? null
      : (column, title, list) =>
          addTask({
            ...defaults,
            title,
            status: column.key,
            project_id: projectId ?? null,
            due_date: todayISO(),
            position: list.length ? Math.max(...list.map((t) => t.position)) + 1 : 0,
          });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragOver={({ over }) => setOverId(over?.id ?? null)}
      onDragCancel={() => {
        setActiveId(null);
        setOverId(null);
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="board">
        {columns.map((column) => (
          <Column
            key={column.key}
            column={column}
            tasks={groups.get(column.key) ?? []}
            overId={overId}
            cardProps={cardProps}
            onInlineAdd={inlineAdd}
            showAll={expanded[column.key]}
            onShowAll={() => setExpanded((e) => ({ ...e, [column.key]: true }))}
          />
        ))}
        {onAddColumn && (
          <button className="column column-new" onClick={onAddColumn}>
            ＋ Ajouter un état
          </button>
        )}
      </div>
      <DragOverlay dropAnimation={{ duration: 180 }}>
        {activeTask ? <TaskCard task={activeTask} {...cardProps(activeTask)} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Board;
