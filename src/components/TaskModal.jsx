import { useEffect, useState } from "react";
import { useAuth, useStore, useToast } from "../context/contexts";
import { callFunction } from "../lib/api";
import { PRIORITIES, formatDuration, uid } from "../lib/utils";
import Modal from "./Modal";

const EDITABLE = ["title", "description", "project_id", "status", "due_date", "priority", "labels", "checklist"];

const Timer = ({ task, onStart, onStop, locked, onUpgrade }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!task.timer_started_at) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [task.timer_started_at]);

  const running = task.timer_started_at ? (now - new Date(task.timer_started_at).getTime()) / 1000 : 0;
  const total = task.time_spent + Math.max(0, running);

  return (
    <div className="timer">
      <span className="timer-value">⏱ {formatDuration(total)}</span>
      {locked ? (
        <button className="btn btn-sm btn-pro" onClick={onUpgrade}>⭐ Suivi du temps (Pro)</button>
      ) : task.timer_started_at ? (
        <button className="btn btn-sm btn-danger" onClick={onStop}>■ Arrêter</button>
      ) : (
        <button className="btn btn-sm" onClick={onStart}>▶ Démarrer</button>
      )}
    </div>
  );
};

const TaskModal = ({ taskId, onClose, onOpen }) => {
  const { tasks, projects, columnsFor, kindOf, updateTask, deleteTask, addTask, startTimer, stopTimer } = useStore();
  const { user, isPro, refreshProfile } = useAuth();
  const { toast } = useToast();
  const task = tasks.find((t) => t.id === taskId);
  const [draft, setDraft] = useState(() => (task ? Object.fromEntries(EDITABLE.map((k) => [k, task[k]])) : null));
  const [labelInput, setLabelInput] = useState("");
  const [itemInput, setItemInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  if (!task || !draft) return null;

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const save = () => {
    const patch = {};
    EDITABLE.forEach((k) => {
      if (JSON.stringify(draft[k]) !== JSON.stringify(task[k])) patch[k] = draft[k];
    });
    if (patch.title !== undefined && !patch.title.trim()) delete patch.title;
    if (Object.keys(patch).length) updateTask(task.id, patch);
  };

  const close = () => {
    save();
    onClose();
  };

  const changeProject = (projectId) => {
    const kind = kindOf({ ...task, status: draft.status, project_id: draft.project_id });
    const cols = columnsFor(projectId || null);
    set({ project_id: projectId || null, status: (cols.find((c) => c.kind === kind) ?? cols[0]).id });
  };

  const addLabel = () => {
    const value = labelInput.trim().replace(/^#/, "").toLowerCase();
    if (value && !draft.labels.includes(value)) set({ labels: [...draft.labels, value] });
    setLabelInput("");
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!itemInput.trim()) return;
    set({ checklist: [...draft.checklist, { id: uid(), text: itemInput.trim(), done: false }] });
    setItemInput("");
  };

  const breakdown = async () => {
    if (!user) return onOpen("auth", "Crée un compte gratuit pour utiliser l'assistant IA (10 générations offertes chaque mois).");
    setAiBusy(true);
    const { data, error, code } = await callFunction("ai-assist", {
      mode: "breakdown",
      input: { title: draft.title, description: draft.description },
    });
    setAiBusy(false);
    if (error) {
      toast(error, { type: "error", action: code === "quota" ? { label: "Passer Pro", onClick: () => onOpen("pricing") } : undefined });
      return;
    }
    const items = (data.result.checklist ?? []).map((text) => ({ id: uid(), text: String(text), done: false }));
    set({
      checklist: [...draft.checklist, ...items],
      description: draft.description || data.result.description || "",
    });
    refreshProfile();
    toast(`✨ ${items.length} sous-étapes ajoutées`, { type: "success" });
  };

  const duplicate = () => {
    save();
    const copy = addTask({ ...draft, title: `${draft.title} (copie)`, checklist: draft.checklist.map((i) => ({ ...i, id: uid(), done: false })) });
    toast("Tâche dupliquée", { type: "success" });
    onOpen("task", copy.id);
  };

  const columns = columnsFor(draft.project_id);
  const doneCount = draft.checklist.filter((i) => i.done).length;

  return (
    <Modal
      title={<span className="muted small">Détails de la tâche</span>}
      onClose={close}
      size="lg"
      footer={
        <>
          <button className="btn btn-danger-ghost" onClick={() => { deleteTask(task.id); onClose(); }}>
            🗑 Supprimer
          </button>
          <button className="btn btn-ghost" onClick={duplicate}>⧉ Dupliquer</button>
          <span className="spacer" />
          <button className="btn btn-primary" onClick={close}>Enregistrer</button>
        </>
      }
    >
      <div className="task-modal">
        <div className="task-main">
          <textarea
            className="task-title-input"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value.replace(/\n/g, " ") })}
            rows={1}
            maxLength={300}
            aria-label="Titre"
          />

          <label className="field">
            <span>Description</span>
            <textarea
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={5}
              placeholder="Détails, liens, notes…"
            />
          </label>

          <div className="field">
            <div className="field-row">
              <span>
                Checklist {draft.checklist.length > 0 && <span className="muted">{doneCount}/{draft.checklist.length}</span>}
              </span>
              <button className="btn btn-sm btn-ai" onClick={breakdown} disabled={aiBusy || !draft.title}>
                {aiBusy ? "Réflexion…" : "✨ Découper avec l'IA"}
              </button>
            </div>
            {draft.checklist.length > 0 && (
              <div className="meter meter--thin">
                <div style={{ width: `${(doneCount / draft.checklist.length) * 100}%` }} />
              </div>
            )}
            <ul className="checklist">
              {draft.checklist.map((item) => (
                <li key={item.id} className={item.done ? "done" : ""}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => set({ checklist: draft.checklist.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)) })}
                    aria-label={item.text}
                  />
                  <input
                    className="checklist-text"
                    value={item.text}
                    onChange={(e) => set({ checklist: draft.checklist.map((i) => (i.id === item.id ? { ...i, text: e.target.value } : i)) })}
                  />
                  <button className="icon-btn icon-btn--sm" aria-label="Retirer" onClick={() => set({ checklist: draft.checklist.filter((i) => i.id !== item.id) })}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={addItem} className="inline-form">
              <input value={itemInput} onChange={(e) => setItemInput(e.target.value)} placeholder="Ajouter une sous-étape + Entrée" />
            </form>
          </div>
        </div>

        <aside className="task-side">
          <label className="field">
            <span>Projet</span>
            <select value={draft.project_id ?? ""} onChange={(e) => changeProject(e.target.value)}>
              <option value="">📥 Sans projet</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>État</span>
            <select value={draft.status} onChange={(e) => set({ status: e.target.value })}>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Échéance</span>
            <input type="date" value={draft.due_date ?? ""} onChange={(e) => set({ due_date: e.target.value || null })} />
          </label>
          <div className="field">
            <span>Priorité</span>
            <div className="seg seg--sm">
              {PRIORITIES.map((p) => (
                <button key={p.value} className={`${draft.priority === p.value ? "active" : ""} prio-btn-${p.value}`} onClick={() => set({ priority: p.value })}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Étiquettes</span>
            <div className="labels-edit">
              {draft.labels.map((l) => (
                <button key={l} className="chip chip-label" onClick={() => set({ labels: draft.labels.filter((x) => x !== l) })} title="Retirer">
                  #{l} ✕
                </button>
              ))}
              <input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addLabel();
                  }
                }}
                onBlur={addLabel}
                placeholder="+ étiquette"
              />
            </div>
          </div>
          <div className="field">
            <span>Temps passé</span>
            <Timer
              task={task}
              locked={!isPro}
              onUpgrade={() => onOpen("pricing")}
              onStart={() => startTimer(task)}
              onStop={() => stopTimer(task)}
            />
          </div>
          <p className="muted small">
            Créée le {new Date(task.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            {task.completed_at && <> · terminée le {new Date(task.completed_at).toLocaleDateString("fr-FR")}</>}
          </p>
        </aside>
      </div>
    </Modal>
  );
};

export default TaskModal;
