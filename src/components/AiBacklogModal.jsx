import { useState } from "react";
import { useAuth, useStore, useToast } from "../context/contexts";
import { callFunction } from "../lib/api";
import { DEFAULT_COLUMNS, PRIORITIES, PROJECT_COLORS, uid } from "../lib/utils";
import Modal from "./Modal";

const EXAMPLE = `Site vitrine pour une boulangerie artisanale.
- 5 pages : accueil, nos produits, à propos, contact, mentions légales
- Galerie photos des produits, horaires d'ouverture, carte Google Maps
- Formulaire de commande de gâteaux pour événements
- Responsive, SEO local, mise en ligne avant le 15 du mois prochain`;

// Nettoie la réponse IA : colonnes valides et tâches bien formées.
const sanitize = (result) => {
  const kinds = ["todo", "doing", "done"];
  let columns = Array.isArray(result.columns) ? result.columns : [];
  columns = columns
    .filter((c) => c && c.name)
    .slice(0, 6)
    .map((c) => ({ id: uid().slice(0, 8), name: String(c.name).slice(0, 30), kind: kinds.includes(c.kind) ? c.kind : "todo", source: c.id }));
  if (columns.length < 2 || !columns.some((c) => c.kind === "done")) columns = DEFAULT_COLUMNS.map((c) => ({ ...c, source: c.id }));

  const tasks = (Array.isArray(result.tasks) ? result.tasks : [])
    .filter((t) => t && t.title)
    .slice(0, 40)
    .map((t, i) => ({
      key: i,
      selected: true,
      title: String(t.title).slice(0, 300),
      description: String(t.description ?? ""),
      priority: [0, 1, 2, 3].includes(Number(t.priority)) ? Number(t.priority) : 0,
      labels: (Array.isArray(t.labels) ? t.labels : []).slice(0, 3).map((l) => String(l).toLowerCase().slice(0, 24)),
      checklist: (Array.isArray(t.checklist) ? t.checklist : []).slice(0, 8).map((text) => ({ id: uid(), text: String(text), done: false })),
      column: columns.find((c) => c.source === t.column)?.id ?? columns[0].id,
    }));

  return {
    name: String(result.project?.name ?? "Nouveau projet").slice(0, 80),
    icon: typeof result.project?.icon === "string" && result.project.icon.length <= 4 ? result.project.icon : "🚀",
    columns: columns.map(({ id, name, kind }) => ({ id, name, kind })),
    tasks,
  };
};

const AiBacklogModal = ({ onClose, onOpen, onCreated }) => {
  const { user, refreshProfile } = useAuth();
  const { addProject, addTasks } = useStore();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(null);

  const loadFile = async (file) => {
    if (!file) return;
    if (file.size > 200_000) return toast("Fichier trop volumineux (200 Ko max).", { type: "error" });
    setText(await file.text());
  };

  const generate = async () => {
    if (!user) return onOpen("auth", "Crée un compte gratuit pour utiliser l'IA : 10 générations offertes chaque mois.");
    setBusy(true);
    const { data, error, code } = await callFunction("ai-assist", { mode: "backlog", input: { text } });
    setBusy(false);
    if (error) {
      toast(error, { type: "error", action: code === "quota" ? { label: "Passer Pro", onClick: () => onOpen("pricing") } : undefined });
      return;
    }
    refreshProfile();
    const clean = sanitize(data.result);
    if (!clean.tasks.length) return toast("L'IA n'a proposé aucune tâche, ajoute plus de détails.", { type: "error" });
    setPlan(clean);
  };

  const create = async () => {
    const project = await addProject({
      name: plan.name,
      icon: plan.icon,
      color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
      columns: plan.columns,
    });
    if (!project) return;
    const chosen = plan.tasks.filter((t) => t.selected);
    await addTasks(
      chosen.map((t, i) => ({
        project_id: project.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        labels: t.labels,
        checklist: t.checklist,
        status: t.column,
        position: i,
      })),
    );
    toast(`✨ Projet « ${project.name} » créé avec ${chosen.length} tâches`, { type: "success" });
    onCreated(project);
  };

  const selectedCount = plan?.tasks.filter((t) => t.selected).length ?? 0;

  return (
    <Modal title="✨ Projet généré par l'IA" onClose={onClose} size="lg">
      {!plan ? (
        <div className="form">
          <p className="muted">
            Colle ton cahier des charges, un brief client ou une simple liste d'idées. L'IA propose les états du
            tableau et un backlog de tâches priorisées, avec leurs sous-étapes. Tu valides avant création.
          </p>
          <textarea
            className="ai-input"
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE}
            maxLength={15000}
          />
          <div className="field-row">
            <label className="btn btn-ghost btn-sm file-btn">
              📄 Importer un .txt / .md
              <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(e) => loadFile(e.target.files[0])} hidden />
            </label>
            <button className="link small" onClick={() => setText(EXAMPLE)}>Essayer avec un exemple</button>
            <span className="muted small">{text.length} / 15 000</span>
          </div>
          <p className="muted small">N'envoie pas de données personnelles ou confidentielles : le texte est traité par un service d'IA externe.</p>
          <button className="btn btn-ai btn-block" disabled={busy || text.trim().length < 30} onClick={generate}>
            {busy ? "L'IA prépare ton backlog…" : "✨ Générer le backlog"}
          </button>
        </div>
      ) : (
        <div className="ai-result">
          <div className="ai-project">
            <input className="ai-icon" value={plan.icon} maxLength={4} onChange={(e) => setPlan({ ...plan, icon: e.target.value })} aria-label="Icône" />
            <input className="ai-name" value={plan.name} maxLength={80} onChange={(e) => setPlan({ ...plan, name: e.target.value })} aria-label="Nom du projet" />
          </div>
          <div className="ai-columns">
            {plan.columns.map((c) => (
              <span key={c.id} className={`chip kind-chip kind-${c.kind}`}>{c.name}</span>
            ))}
          </div>
          <ul className="ai-tasks">
            {plan.tasks.map((t) => (
              <li key={t.key} className={t.selected ? "" : "off"}>
                <input
                  type="checkbox"
                  checked={t.selected}
                  onChange={() => setPlan({ ...plan, tasks: plan.tasks.map((x) => (x.key === t.key ? { ...x, selected: !x.selected } : x)) })}
                  aria-label={t.title}
                />
                <div>
                  <strong>{t.title}</strong>
                  {t.priority > 0 && <span className={`prio-flag prio-flag--${t.priority}`}>{PRIORITIES[t.priority].short}</span>}
                  {t.description && <p className="muted small">{t.description}</p>}
                  {t.checklist.length > 0 && <p className="muted small">☑ {t.checklist.map((i) => i.text).join(" · ")}</p>}
                </div>
              </li>
            ))}
          </ul>
          <div className="field-row">
            <button className="btn btn-ghost" onClick={() => setPlan(null)}>← Modifier le texte</button>
            <button className="btn btn-primary" disabled={!selectedCount} onClick={create}>
              Créer le projet ({selectedCount} tâches)
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AiBacklogModal;
