import { useMemo, useState } from "react";
import { useAuth, useStore, useToast } from "../context/contexts";
import { downloadFile, formatDuration, toCSV, todayISO } from "../lib/utils";
import Modal from "./Modal";

// ── Rapport de temps (Pro) ───────────────────────────────────
export const TimeReportModal = ({ onClose, onOpen }) => {
  const { tasks, projectsById } = useStore();
  const { isPro } = useAuth();
  const [now] = useState(() => Date.now());

  const rows = useMemo(() => {
    const byProject = new Map();
    tasks
      .filter((t) => t.time_spent > 0 || t.timer_started_at)
      .forEach((t) => {
        const running = t.timer_started_at ? (now - new Date(t.timer_started_at).getTime()) / 1000 : 0;
        const key = t.project_id ?? "none";
        const entry = byProject.get(key) ?? { project: projectsById.get(t.project_id), total: 0, tasks: [] };
        entry.total += t.time_spent + running;
        entry.tasks.push({ ...t, total: t.time_spent + running });
        byProject.set(key, entry);
      });
    return [...byProject.values()].sort((a, b) => b.total - a.total);
  }, [tasks, projectsById, now]);

  const grand = rows.reduce((s, r) => s + r.total, 0);

  const exportCsv = () => {
    const lines = rows.flatMap((r) =>
      r.tasks.map((t) => [r.project?.name ?? "Sans projet", t.title, (t.total / 3600).toFixed(2).replace(".", ","), formatDuration(t.total)]),
    );
    downloadFile(`temps-lovatasks-${todayISO()}.csv`, toCSV([["Projet", "Tâche", "Heures", "Durée"], ...lines]), "text/csv;charset=utf-8");
  };

  return (
    <Modal title="⏱️ Rapport de temps" onClose={onClose}>
      {!isPro ? (
        <div className="empty-state">
          <p>
            Lance un chrono sur chaque tâche, puis retrouve ici le temps passé par projet, exportable en CSV pour
            ta facturation client.
          </p>
          <button className="btn btn-pro" onClick={() => onOpen("pricing")}>⭐ Débloquer avec Pro</button>
        </div>
      ) : rows.length === 0 ? (
        <p className="muted">Aucun temps suivi pour l'instant. Ouvre une tâche et clique sur ▶ Démarrer.</p>
      ) : (
        <>
          <p className="time-total">Total : <strong>{formatDuration(grand)}</strong></p>
          {rows.map((r) => (
            <details key={r.project?.id ?? "none"} className="time-project">
              <summary>
                <span>{r.project ? `${r.project.icon} ${r.project.name}` : "📥 Sans projet"}</span>
                <span className="meter meter--inline"><span style={{ width: `${(r.total / grand) * 100}%`, background: r.project?.color }} /></span>
                <strong>{formatDuration(r.total)}</strong>
              </summary>
              <ul>
                {r.tasks.sort((a, b) => b.total - a.total).map((t) => (
                  <li key={t.id}>
                    <span>{t.title}</span>
                    <span>{formatDuration(t.total)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          <button className="btn btn-primary" onClick={exportCsv}>⬇ Exporter pour facturation (CSV)</button>
        </>
      )}
    </Modal>
  );
};

// ── Export / import ──────────────────────────────────────────
export const DataModal = ({ onClose }) => {
  const { tasks, projects, importBackup } = useStore();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const exportJson = () => {
    const backup = { app: "LovaTasks", version: 1, exported_at: new Date().toISOString(), projects, tasks };
    downloadFile(`lovatasks-${todayISO()}.json`, JSON.stringify(backup, null, 2), "application/json");
  };

  const importJson = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const backup = JSON.parse(await file.text());
      if (backup.app !== "LovaTasks") throw new Error("Ce fichier n'est pas une sauvegarde LovaTasks.");
      const result = await importBackup(backup);
      toast(`${result.tasks} tâche(s) et ${result.projects} projet(s) importés`, { type: "success" });
      onClose();
    } catch (error) {
      toast(error.message, { type: "error" });
    }
    setBusy(false);
  };

  return (
    <Modal title="💾 Mes données" onClose={onClose} size="sm">
      <div className="form">
        <p className="muted">Tes données t'appartiennent : exporte-les à tout moment.</p>
        <button className="btn btn-primary btn-block" onClick={exportJson}>
          ⬇ Exporter tout (JSON) — {tasks.length} tâches, {projects.length} projets
        </button>
        <label className="btn btn-ghost btn-block file-btn">
          {busy ? "Import…" : "⬆ Importer une sauvegarde JSON"}
          <input type="file" accept="application/json,.json" hidden onChange={(e) => importJson(e.target.files[0])} />
        </label>
        <p className="muted small">L'import ajoute les éléments sans rien supprimer.</p>
      </div>
    </Modal>
  );
};

// ── Raccourcis ───────────────────────────────────────────────
const SHORTCUTS = [
  ["N", "Nouvelle tâche"],
  ["/", "Rechercher"],
  ["B / L", "Vue tableau / liste"],
  ["T", "Filtre « Aujourd'hui »"],
  ["H", "Filtre horizon : tout / court / long terme"],
  ["1 … 9", "Changer d'onglet"],
  ["P", "Nouveau projet"],
  ["Échap", "Fermer une fenêtre"],
];

const SYNTAX = [
  ["demain, lundi, 25/12, dans 3j", "Échéance"],
  ["!1  !2  !3", "Priorité urgente / haute / basse"],
  ["#client", "Projet (début du nom)"],
  ["@appel", "Étiquette"],
  ["~court  ~long", "Horizon court terme / long terme"],
  ["sans date", "Pas d'échéance"],
];

export const ShortcutsModal = ({ onClose }) => (
  <Modal title="⌨️ Raccourcis & saisie rapide" onClose={onClose} size="sm">
    <h3 className="h-small">Clavier</h3>
    <dl className="kbd-list">
      {SHORTCUTS.map(([k, v]) => (
        <div key={k}>
          <dt><kbd>{k}</kbd></dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
    <h3 className="h-small">Dans la saisie rapide</h3>
    <dl className="kbd-list">
      {SYNTAX.map(([k, v]) => (
        <div key={k}>
          <dt><code>{k}</code></dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  </Modal>
);
