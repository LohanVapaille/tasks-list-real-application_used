import { useMemo, useState } from "react";
import { useStore } from "../context/contexts";
import { parseQuickTask } from "../lib/quickParse";
import { PRIORITIES, formatDue, todayISO } from "../lib/utils";

// Saisie rapide : nom + Entrée. Date du jour par défaut, projet optionnel.
const QuickAdd = ({ defaultProjectId, inputRef }) => {
  const { projects, addTask, projectsById } = useStore();
  const [text, setText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [lastDefault, setLastDefault] = useState(defaultProjectId);

  // Quand on change d'onglet, le projet présélectionné suit l'onglet.
  if (lastDefault !== defaultProjectId) {
    setLastDefault(defaultProjectId);
    setProjectId(defaultProjectId ?? "");
  }

  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);
  const parsed = useMemo(() => parseQuickTask(text, activeProjects), [text, activeProjects]);

  const submit = (e) => {
    e.preventDefault();
    if (!parsed.title) return;
    addTask({
      title: parsed.title,
      due_date: parsed.due_date !== undefined ? parsed.due_date : date || null,
      project_id: parsed.project_id ?? (projectId || null),
      priority: parsed.priority ?? 0,
      labels: parsed.labels,
    });
    setText("");
  };

  const chips = [];
  if (parsed.due_date !== undefined) chips.push(`📅 ${parsed.due_date ? formatDue(parsed.due_date) : "Sans date"}`);
  if (parsed.priority) chips.push(`🚩 ${PRIORITIES[parsed.priority].label}`);
  if (parsed.project_id) chips.push(`${projectsById.get(parsed.project_id).icon} ${projectsById.get(parsed.project_id).name}`);
  parsed.labels.forEach((l) => chips.push(`🏷️ ${l}`));

  return (
    <form className="quickadd" onSubmit={submit}>
      <div className="quickadd-main">
        <span className="quickadd-plus" aria-hidden="true">＋</span>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ajouter une tâche…  ex : Appeler le client demain !1 @tel   ( N )"
          aria-label="Nouvelle tâche"
          maxLength={300}
        />
        <input
          type="date"
          className="quickadd-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Échéance"
          title="Échéance (aujourd'hui par défaut)"
        />
        <select
          className="quickadd-project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="Projet"
        >
          <option value="">Sans projet</option>
          {activeProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit" disabled={!parsed.title}>
          Ajouter
        </button>
      </div>
      {chips.length > 0 && (
        <div className="quickadd-chips" aria-live="polite">
          {chips.map((c) => (
            <span key={c} className="chip chip--soft">{c}</span>
          ))}
        </div>
      )}
    </form>
  );
};

export default QuickAdd;
