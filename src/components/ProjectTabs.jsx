import { useStore } from "../context/contexts";

const Tab = ({ id, icon, label, color, count, project, active, onChange, onEditProject }) => (
  <button
    role="tab"
    aria-selected={active === id}
    className={`tab${active === id ? " active" : ""}`}
    style={color ? { "--tab-color": color } : undefined}
    onClick={() => onChange(id)}
    onDoubleClick={project ? () => onEditProject(project) : undefined}
    title={project ? "Double-clic pour les réglages du projet" : undefined}
  >
    <span className="tab-icon" aria-hidden="true">{icon}</span>
    <span className="tab-label">{label}</span>
    {count > 0 && <span className="tab-count">{count}</span>}
    {project && active === id && (
      <span
        className="tab-gear"
        role="button"
        tabIndex={0}
        aria-label={`Réglages de ${project.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onEditProject(project);
        }}
        onKeyDown={(e) => e.key === "Enter" && onEditProject(project)}
      >
        ⚙
      </span>
    )}
  </button>
);


const ProjectTabs = ({ active, onChange, onNewProject, onEditProject, counts }) => {
  const { projects } = useStore();
  const visible = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);


  const common = { active, onChange, onEditProject };

  return (
    <nav className="tabs" role="tablist" aria-label="Projets">
      <Tab {...common} id="all" icon="🗂️" label="Toutes les tâches" count={counts.all} />
      <Tab {...common} id="inbox" icon="📥" label="Sans projet" count={counts.inbox} />
      <span className="tabs-sep" aria-hidden="true" />
      {visible.map((p) => (
        <Tab {...common} key={p.id} id={p.id} icon={p.icon} label={p.name} color={p.color} count={counts[p.id]} project={p} />
      ))}
      <button className="tab tab-new" onClick={onNewProject} title="Nouveau projet">
        <span aria-hidden="true">＋</span> <span className="tab-label">Projet</span>
      </button>
      {archived.length > 0 && (
        <select
          className="tab-archived"
          value=""
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Projets archivés"
        >
          <option value="">🗄️ Archivés ({archived.length})</option>
          {archived.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.name}
            </option>
          ))}
        </select>
      )}
    </nav>
  );
};

export default ProjectTabs;
