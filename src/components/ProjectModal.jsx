import { useCallback, useEffect, useState } from "react";
import { useAuth, useStore, useToast } from "../context/contexts";
import { appUrl } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import { DEFAULT_COLUMNS, KIND_LABELS, PROJECT_COLORS, PROJECT_ICONS, downloadFile, toCSV, uid } from "../lib/utils";
import Modal from "./Modal";
import { Avatar } from "./UserMenu";

const col = (name, kind) => ({ id: uid().slice(0, 8), name, kind });

const TEMPLATES = [
  { id: "simple", label: "Kanban simple", icon: "📋", columns: () => DEFAULT_COLUMNS },
  {
    id: "dev",
    label: "Dev / Sprint",
    icon: "🛠️",
    columns: () => [col("Backlog", "todo"), col("À faire", "todo"), col("En cours", "doing"), col("En revue", "doing"), col("Terminé", "done")],
  },
  {
    id: "client",
    label: "Client / Freelance",
    icon: "💼",
    columns: () => [col("Devis / Cadrage", "todo"), col("À faire", "todo"), col("En cours", "doing"), col("Validation client", "doing"), col("Livré", "done")],
  },
  {
    id: "perso",
    label: "Perso",
    icon: "🏠",
    columns: () => [col("Idées", "todo"), col("À faire", "todo"), col("Fait", "done")],
  },
];

const Appearance = ({ value, onChange }) => (
  <>
    <div className="field">
      <span>Icône</span>
      <div className="swatches">
        {PROJECT_ICONS.map((icon) => (
          <button key={icon} className={`swatch swatch--icon${value.icon === icon ? " active" : ""}`} onClick={() => onChange({ icon })}>
            {icon}
          </button>
        ))}
      </div>
    </div>
    <div className="field">
      <span>Couleur</span>
      <div className="swatches">
        {PROJECT_COLORS.map((color) => (
          <button
            key={color}
            className={`swatch${value.color === color ? " active" : ""}`}
            style={{ background: color }}
            onClick={() => onChange({ color })}
            aria-label={`Couleur ${color}`}
          />
        ))}
      </div>
    </div>
  </>
);

// ── Création ─────────────────────────────────────────────────
export const NewProjectModal = ({ onClose, onCreated, onOpen }) => {
  const { addProject } = useStore();
  const [form, setForm] = useState({ name: "", icon: "🚀", color: PROJECT_COLORS[0] });
  const [template, setTemplate] = useState("simple");

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const columns = TEMPLATES.find((t) => t.id === template).columns();
    const project = await addProject({ ...form, name: form.name.trim(), columns });
    if (project) onCreated(project);
  };

  return (
    <Modal title="Nouveau projet" onClose={onClose}>
      <button className="ai-banner" onClick={() => onOpen("ai")}>
        <span className="ai-banner-icon">✨</span>
        <span>
          <strong>Générer le projet avec l'IA</strong>
          <span>Colle ton cahier des charges : colonnes et backlog prêts en 10 secondes.</span>
        </span>
        <span aria-hidden="true">→</span>
      </button>

      <form className="form" onSubmit={create}>
        <label>
          Nom du projet
          <input autoFocus value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Site de Marie, Déménagement…" required />
        </label>
        <div className="field">
          <span>Modèle d'états</span>
          <div className="templates">
            {TEMPLATES.map((t) => (
              <button type="button" key={t.id} className={`template${template === t.id ? " active" : ""}`} onClick={() => setTemplate(t.id)}>
                <span className="template-icon">{t.icon}</span>
                <strong>{t.label}</strong>
                <span className="muted small">{t.columns().map((c) => c.name).join(" → ")}</span>
              </button>
            ))}
          </div>
        </div>
        <Appearance value={form} onChange={(patch) => setForm({ ...form, ...patch })} />
        <button className="btn btn-primary btn-block" type="submit" disabled={!form.name.trim()}>
          Créer le projet
        </button>
      </form>
    </Modal>
  );
};

// ── Colonnes / états ─────────────────────────────────────────
const ColumnsEditor = ({ project }) => {
  const { updateProject, deleteColumn, tasks } = useStore();
  const columns = project.columns;
  const count = (id) => tasks.filter((t) => t.project_id === project.id && t.status === id).length;

  const save = (next) => updateProject(project.id, { columns: next });
  const patch = (id, change) => save(columns.map((c) => (c.id === id ? { ...c, ...change } : c)));
  const move = (index, delta) => {
    const next = [...columns];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    save(next);
  };

  return (
    <div className="columns-editor">
      <p className="muted small">
        Le <strong>type</strong> d'un état sert à la vue « Toutes les tâches » et à la case à cocher : une tâche dans
        un état de type « Terminé » est considérée comme finie.
      </p>
      {columns.map((c, i) => (
        <div key={c.id} className="col-row">
          <input
            defaultValue={c.name}
            maxLength={30}
            onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && patch(c.id, { name: e.target.value.trim() })}
            aria-label="Nom de l'état"
          />
          <select value={c.kind} onChange={(e) => patch(c.id, { kind: e.target.value })} aria-label="Type">
            {Object.entries(KIND_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <span className="muted small col-count">{count(c.id)}</span>
          <button className="icon-btn icon-btn--sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Monter">↑</button>
          <button className="icon-btn icon-btn--sm" disabled={i === columns.length - 1} onClick={() => move(i, 1)} aria-label="Descendre">↓</button>
          <button
            className="icon-btn icon-btn--sm"
            disabled={columns.length <= 1}
            onClick={() => {
              const n = count(c.id);
              if (!n || window.confirm(`Supprimer « ${c.name} » ? Ses ${n} tâche(s) iront dans « ${columns.find((x) => x.id !== c.id).name} ».`)) {
                deleteColumn(project.id, c.id);
              }
            }}
            aria-label="Supprimer l'état"
          >
            🗑
          </button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => save([...columns.slice(0, -1), col("Nouvel état", "doing"), ...columns.slice(-1)])}>
        ＋ Ajouter un état
      </button>
    </div>
  );
};

// ── Membres ──────────────────────────────────────────────────
const Members = ({ project, onLeft }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refresh } = useStore();
  const [people, setPeople] = useState([]);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const isOwner = project.owner_id === user.id;

  const load = useCallback(async () => {
    const [p, i] = await Promise.all([
      supabase.rpc("project_people", { pid: project.id }),
      supabase.from("project_invites").select("email, created_at").eq("project_id", project.id),
    ]);
    setPeople(p.data ?? []);
    setInvites(i.data ?? []);
  }, [project.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement asynchrone initial
    load();
  }, [load]);

  const invite = async (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    const { error } = await supabase.from("project_invites").insert({ project_id: project.id, email: clean });
    if (error) return toast(error.code === "23505" ? "Déjà invité." : error.message, { type: "error" });
    setEmail("");
    load();
    toast(`Invitation enregistrée pour ${clean}`, { type: "success" });
  };

  const remove = async (userId) => {
    const self = userId === user.id;
    if (!window.confirm(self ? "Quitter ce projet ?" : "Retirer ce membre du projet ?")) return;
    const { error } = await supabase.from("project_members").delete().eq("project_id", project.id).eq("user_id", userId);
    if (error) return toast(error.message, { type: "error" });
    if (self) {
      await refresh();
      onLeft();
    } else load();
  };

  const cancelInvite = async (inviteEmail) => {
    await supabase.from("project_invites").delete().eq("project_id", project.id).eq("email", inviteEmail);
    load();
  };

  return (
    <div className="members">
      <p className="muted small">
        Les membres voient et modifient toutes les tâches de ce projet, en temps réel. La personne invitée doit
        se connecter à LovaTasks avec cette adresse e-mail (Google ou e-mail) : le projet apparaîtra
        automatiquement dans ses onglets.
      </p>
      <form className="inline-form" onSubmit={invite}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" required />
        <button className="btn btn-primary btn-sm" type="submit">Inviter</button>
      </form>
      <button
        className="link small"
        onClick={() => {
          navigator.clipboard?.writeText(appUrl());
          toast("Lien de LovaTasks copié : envoie-le à ton invité", { type: "success" });
        }}
      >
        📋 Copier le lien de l'application à envoyer
      </button>
      <ul className="people">
        {people.map((p) => (
          <li key={p.user_id}>
            <Avatar url={p.avatar_url} name={p.display_name || p.email} size={30} />
            <span>
              <strong>{p.display_name || p.email}</strong>
              <span className="muted small">{p.email}</span>
            </span>
            <span className="chip">{p.role === "owner" ? "Propriétaire" : "Membre"}</span>
            {p.role !== "owner" && (isOwner || p.user_id === user.id) && (
              <button className="btn btn-sm btn-ghost" onClick={() => remove(p.user_id)}>
                {p.user_id === user.id ? "Quitter" : "Retirer"}
              </button>
            )}
          </li>
        ))}
        {invites.map((i) => (
          <li key={i.email} className="pending">
            <span className="avatar avatar--letter" style={{ width: 30, height: 30 }}>✉</span>
            <span>
              <strong>{i.email}</strong>
              <span className="muted small">Invitation en attente</span>
            </span>
            <button className="btn btn-sm btn-ghost" onClick={() => cancelInvite(i.email)}>Annuler</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ── Portail client (Pro) ─────────────────────────────────────
const PublicShare = ({ project, onOpen }) => {
  const { isPro, user } = useAuth();
  const { refresh } = useStore();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const link = project.public_token ? `${appUrl()}?board=${project.public_token}` : "";
  const isOwner = project.owner_id === user.id;

  const toggle = async (enabled) => {
    setBusy(true);
    const { error } = await supabase.rpc("set_public_share", { pid: project.id, enabled });
    setBusy(false);
    if (error) return toast(error.message, { type: "error" });
    await refresh();
    toast(enabled ? "Portail client activé 🎉" : "Lien public désactivé", { type: "success" });
  };

  return (
    <div className="public-share">
      <div className="pro-feature">
        <span className="pro-feature-icon">🌐</span>
        <div>
          <strong>Portail client</strong>
          <p className="muted small">
            Un lien en lecture seule à envoyer à ton client : il suit l'avancement du projet en temps réel, sans
            compte, sans voir tes autres projets. Idéal pour les freelances.
          </p>
        </div>
      </div>
      {!isPro ? (
        <button className="btn btn-pro" onClick={() => onOpen("pricing")}>⭐ Débloquer avec Pro</button>
      ) : !isOwner ? (
        <p className="muted small">Seul le propriétaire du projet peut activer le portail.</p>
      ) : link ? (
        <>
          <div className="inline-form">
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <button className="btn btn-sm btn-primary" onClick={() => { navigator.clipboard?.writeText(link); toast("Lien copié", { type: "success" }); }}>
              Copier
            </button>
          </div>
          <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => toggle(false)}>Désactiver le lien</button>
        </>
      ) : (
        <button className="btn btn-primary" disabled={busy} onClick={() => toggle(true)}>Activer le portail client</button>
      )}
    </div>
  );
};

// ── Réglages ─────────────────────────────────────────────────
export const ProjectSettingsModal = ({ projectId, onClose, onOpen, onDeleted }) => {
  const { projects, tasks, updateProject, deleteProject, columnsFor, isGuest } = useStore();
  const { user } = useAuth();
  const project = projects.find((p) => p.id === projectId);
  const [tab, setTab] = useState("general");
  const [name, setName] = useState(project?.name ?? "");

  if (!project) return null;
  const isOwner = isGuest || project.owner_id === user?.id;

  const exportCsv = () => {
    const cols = columnsFor(project.id);
    const rows = tasks
      .filter((t) => t.project_id === project.id)
      .map((t) => [
        t.title,
        cols.find((c) => c.id === t.status)?.name ?? t.status,
        t.priority,
        t.due_date ?? "",
        t.labels.join(", "),
        t.checklist.map((i) => `${i.done ? "[x]" : "[ ]"} ${i.text}`).join(" | "),
        Math.round(t.time_spent / 60),
        t.description,
      ]);
    downloadFile(
      `${project.name}.csv`,
      toCSV([["Titre", "État", "Priorité", "Échéance", "Étiquettes", "Checklist", "Minutes", "Description"], ...rows]),
      "text/csv;charset=utf-8",
    );
  };

  const tabs = [
    ["general", "Général"],
    ["columns", "États"],
    ["members", "Partage"],
    ["public", "Portail client"],
  ];

  return (
    <Modal title={`${project.icon} ${project.name}`} onClose={onClose}>
      <div className="seg" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="form">
          <label>
            Nom
            <input
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== project.name && updateProject(project.id, { name: name.trim() })}
            />
          </label>
          <Appearance value={project} onChange={(patch) => updateProject(project.id, patch)} />
          <div className="danger-zone">
            <button className="btn btn-ghost btn-sm" onClick={exportCsv}>⬇ Exporter en CSV</button>
            <button className="btn btn-ghost btn-sm" onClick={() => updateProject(project.id, { archived: !project.archived })}>
              {project.archived ? "♻ Désarchiver" : "🗄 Archiver"}
            </button>
            {isOwner && (
              <button
                className="btn btn-danger-ghost btn-sm"
                onClick={() => {
                  if (window.confirm(`Supprimer définitivement « ${project.name} » et toutes ses tâches${isGuest ? "" : " (pour tous les membres)"} ?`)) {
                    deleteProject(project.id);
                    onDeleted();
                  }
                }}
              >
                🗑 Supprimer le projet
              </button>
            )}
          </div>
        </div>
      )}

      {tab === "columns" && <ColumnsEditor project={project} />}

      {(tab === "members" || tab === "public") && isGuest && (
        <div className="empty-state">
          <p>🔐 Le partage nécessite un compte (gratuit) pour synchroniser le projet entre plusieurs personnes.</p>
          <button className="btn btn-primary" onClick={() => onOpen("auth")}>Créer un compte gratuit</button>
        </div>
      )}
      {tab === "members" && !isGuest && <Members project={project} onLeft={onDeleted} />}
      {tab === "public" && !isGuest && <PublicShare project={project} onOpen={onOpen} />}
    </Modal>
  );
};
