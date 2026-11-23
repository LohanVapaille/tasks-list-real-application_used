import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AiBacklogModal from "./components/AiBacklogModal";
import AuthModal from "./components/AuthModal";
import Board from "./components/Board";
import Footer from "./components/Footer";
import LegalModal from "./components/LegalModal";
import ListView from "./components/ListView";
import PricingModal from "./components/PricingModal";
import { NewProjectModal, ProjectSettingsModal } from "./components/ProjectModal";
import ProjectTabs from "./components/ProjectTabs";
import PublicBoard from "./components/PublicBoard";
import QuickAdd from "./components/QuickAdd";
import TaskModal from "./components/TaskModal";
import { DataModal, ShortcutsModal, TimeReportModal } from "./components/ToolModals";
import TopBar from "./components/TopBar";
import AuthProvider from "./context/AuthProvider";
import { useAuth, useStore, useToast } from "./context/contexts";
import StoreProvider from "./context/StoreProvider";
import ToastProvider from "./context/ToastProvider";
import { callFunction } from "./lib/api";
import { GROUP_BY, HORIZONS, SORTS, horizonOf, labelColor } from "./lib/tasks";
import { DEFAULT_COLUMNS, KIND_LABELS, todayISO, uid } from "./lib/utils";

const PREFS_KEY = "lovatasks:prefs";
const readPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
  } catch {
    return {};
  }
};

const normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ALL_COLUMNS = Object.entries(KIND_LABELS).map(([kind, name]) => ({ key: kind, name, kind }));

const Workspace = () => {
  const store = useStore();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { tasks, projects, projectsById, kindOf, loaded, isGuest, updateProject } = store;

  const prefs = useMemo(readPrefs, []);
  const [tab, setTab] = useState(prefs.tab ?? "all");
  const [view, setView] = useState(prefs.view ?? "board");
  const [theme, setTheme] = useState(
    prefs.theme ?? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  const [filters, setFilters] = useState({ today: false, urgent: false, hideDone: false });
  const [horizon, setHorizon] = useState(prefs.horizon ?? "all");
  const [labelFilter, setLabelFilter] = useState(null);
  const [sort, setSort] = useState(prefs.sort ?? "manual");
  const [groupBy, setGroupBy] = useState(prefs.groupBy ?? "date");
  const [search, setSearch] = useState("");
  const [modals, setModals] = useState([]);
  const [focusMap, setFocusMap] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [guestBanner, setGuestBanner] = useState(!prefs.hideGuestBanner);
  const quickAddRef = useRef(null);
  const searchRef = useRef(null);

  // ── Préférences ───────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0a1822" : "#f28c28");
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ tab, view, theme, horizon, sort, groupBy, hideGuestBanner: !guestBanner }),
      );
    } catch {
      // stockage indisponible
    }
  }, [tab, view, theme, horizon, sort, groupBy, guestBanner]);

  // ── Modales (pile) ────────────────────────────────────────
  const open = useCallback((type, payload) => {
    setModals((stack) => [...stack.filter((m) => m.type !== type || type === "task"), { id: uid(), type, payload }]);
  }, []);
  const closeModal = useCallback((id) => setModals((stack) => stack.filter((m) => m.id !== id)), []);

  // Après connexion, on ferme la fenêtre de connexion.
  useEffect(() => {
    if (user) setModals((stack) => stack.filter((m) => m.type !== "auth"));
  }, [user]);

  // ── Retour de Stripe Checkout ─────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;
    window.history.replaceState({}, "", window.location.pathname);
    if (checkout === "success") {
      toast("⭐ Bienvenue dans LovaTasks Pro ! Merci pour ton soutien.", { type: "success", duration: 6000 });
      [1500, 4000, 9000].forEach((ms) => setTimeout(refreshProfile, ms));
    } else {
      toast("Paiement annulé, aucun montant n'a été débité.");
    }
  }, [toast, refreshProfile]);

  // ── Onglet courant ────────────────────────────────────────
  const currentProject = projectsById.get(tab) ?? null;
  const activeTab = tab === "all" || tab === "inbox" || currentProject ? tab : "all";

  const columns = useMemo(() => {
    if (activeTab === "all") return ALL_COLUMNS;
    const cols = currentProject ? currentProject.columns : DEFAULT_COLUMNS;
    return cols.map((c) => ({ key: c.id, name: c.name, kind: c.kind }));
  }, [activeTab, currentProject]);

  const archivedIds = useMemo(() => new Set(projects.filter((p) => p.archived).map((p) => p.id)), [projects]);

  const scoped = useMemo(() => {
    if (activeTab === "all") return tasks.filter((t) => !archivedIds.has(t.project_id));
    if (activeTab === "inbox") return tasks.filter((t) => !t.project_id);
    return tasks.filter((t) => t.project_id === activeTab);
  }, [tasks, activeTab, archivedIds]);

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    const today = todayISO();
    return scoped.filter((t) => {
      if (q && !normalize(`${t.title} ${t.description} ${t.labels.join(" ")}`).includes(q)) return false;
      if (filters.today && (!t.due_date || t.due_date > today)) return false;
      if (filters.urgent && t.priority < 2) return false;
      if (filters.hideDone && kindOf(t) === "done") return false;
      if (horizon !== "all" && horizonOf(t) !== horizon) return false;
      if (labelFilter && !t.labels.includes(labelFilter)) return false;
      return true;
    });
  }, [scoped, search, filters, kindOf, horizon, labelFilter]);

  // Compteurs de tâches ouvertes par horizon et par étiquette (onglet courant).
  const facets = useMemo(() => {
    const byHorizon = { short: 0, long: 0 };
    const byLabel = new Map();
    scoped.forEach((t) => {
      if (kindOf(t) === "done") return;
      byHorizon[horizonOf(t)]++;
      t.labels.forEach((l) => byLabel.set(l, (byLabel.get(l) ?? 0) + 1));
    });
    const labels = [...byLabel.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
    return { byHorizon, labels };
  }, [scoped, kindOf]);

  const toggleLabel = useCallback((label) => setLabelFilter((l) => (l === label ? null : label)), []);

  const counts = useMemo(() => {
    const c = { all: 0, inbox: 0 };
    tasks.forEach((t) => {
      if (kindOf(t) === "done") return;
      if (!archivedIds.has(t.project_id)) c.all++;
      if (!t.project_id) c.inbox++;
      else c[t.project_id] = (c[t.project_id] ?? 0) + 1;
    });
    return c;
  }, [tasks, kindOf, archivedIds]);

  const stats = useMemo(() => {
    const today = todayISO();
    let open = 0, overdue = 0, doneToday = 0, done = 0;
    scoped.forEach((t) => {
      if (kindOf(t) === "done") {
        done++;
        if (t.completed_at?.slice(0, 10) === today) doneToday++;
      } else {
        open++;
        if (t.due_date && t.due_date < today) overdue++;
      }
    });
    return { open, overdue, doneToday, progress: scoped.length ? Math.round((done / scoped.length) * 100) : 0 };
  }, [scoped, kindOf]);

  // ── IA « Ma journée » ─────────────────────────────────────
  const planDay = async () => {
    if (!user) return open("auth", "Crée un compte gratuit pour que l'IA planifie ta journée.");
    const candidates = scoped
      .filter((t) => kindOf(t) !== "done")
      .slice(0, 80)
      .map((t) => ({
        id: t.id,
        title: t.title,
        due: t.due_date,
        priority: t.priority,
        horizon: horizonOf(t),
        project: projectsById.get(t.project_id)?.name,
        state: kindOf(t),
      }));
    if (!candidates.length) return toast("Aucune tâche ouverte à planifier 🎉");
    setPlanning(true);
    const { data, error, code } = await callFunction("ai-assist", {
      mode: "plan",
      input: { tasks: candidates, today: new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) },
    });
    setPlanning(false);
    if (error) {
      return toast(error, { type: "error", action: code === "quota" ? { label: "Passer Pro", onClick: () => open("pricing") } : undefined });
    }
    refreshProfile();
    const ids = new Set(candidates.map((c) => c.id));
    const map = Object.fromEntries((data.result.focus ?? []).filter((f) => ids.has(f.id)).map((f) => [f.id, f.reason || "Focus du jour"]));
    setFocusMap(map);
    if (data.result.tip) toast(`💡 ${data.result.tip}`, { duration: 8000 });
  };

  // ── Raccourcis clavier ────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = e.target.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || e.target.isContentEditable) return;
      if (document.querySelector(".modal")) return;
      const key = e.key.toLowerCase();
      if (key === "n") {
        e.preventDefault();
        quickAddRef.current?.focus();
      } else if (key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (key === "b") setView("board");
      else if (key === "l") setView("list");
      else if (key === "t") setFilters((f) => ({ ...f, today: !f.today }));
      else if (key === "h") setHorizon((h) => ({ all: "short", short: "long", long: "all" })[h] ?? "all");
      else if (key === "p") open("newProject");
      else if (/^[1-9]$/.test(key)) {
        const ids = ["all", "inbox", ...projects.filter((p) => !p.archived).map((p) => p.id)];
        const target = ids[Number(key) - 1];
        if (target) setTab(target);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [projects, open]);

  const addColumn = () => {
    if (!currentProject) return;
    const name = window.prompt("Nom du nouvel état (ex : En revue, Bloqué, Validation client) :");
    if (!name?.trim()) return;
    const cols = currentProject.columns;
    const column = { id: uid().slice(0, 8), name: name.trim().slice(0, 30), kind: "doing" };
    const doneIndex = cols.findIndex((c) => c.kind === "done");
    const next = doneIndex === -1 ? [...cols, column] : [...cols.slice(0, doneIndex), column, ...cols.slice(doneIndex)];
    updateProject(currentProject.id, { columns: next });
  };

  const isEmpty = loaded && tasks.length === 0 && projects.length === 0;

  const renderModal = (m) => {
    const close = () => closeModal(m.id);
    if (m.type.startsWith("legal:")) return <LegalModal key={m.id} initialTab={m.type.slice(6)} onClose={close} />;
    switch (m.type) {
      case "auth":
        return <AuthModal key={m.id} reason={m.payload} onClose={close} />;
      case "pricing":
        return <PricingModal key={m.id} onClose={close} onOpen={open} />;
      case "ai":
        return (
          <AiBacklogModal
            key={m.id}
            onClose={close}
            onOpen={open}
            onCreated={(p) => {
              setModals([]);
              setTab(p.id);
            }}
          />
        );
      case "newProject":
        return (
          <NewProjectModal
            key={m.id}
            onClose={close}
            onOpen={(type) => {
              close();
              open(type);
            }}
            onCreated={(p) => {
              close();
              setTab(p.id);
            }}
          />
        );
      case "project":
        return (
          <ProjectSettingsModal
            key={m.id}
            projectId={m.payload}
            onClose={close}
            onOpen={open}
            onDeleted={() => {
              close();
              setTab("all");
            }}
          />
        );
      case "task":
        return <TaskModal key={m.id} taskId={m.payload} onClose={close} onOpen={open} />;
      case "time":
        return <TimeReportModal key={m.id} onClose={close} onOpen={open} />;
      case "data":
        return <DataModal key={m.id} onClose={close} />;
      case "shortcuts":
        return <ShortcutsModal key={m.id} onClose={close} />;
      default:
        return null;
    }
  };

  const openTask = useCallback((task) => open("task", task.id), [open]);

  // Une tâche ajoutée depuis une colonne hérite des filtres actifs (horizon, étiquette).
  const inlineDefaults = useMemo(
    () => ({ horizon: horizon === "long" ? "long" : "short", labels: labelFilter ? [labelFilter] : [] }),
    [horizon, labelFilter],
  );

  return (
    <div className="app">
      <TopBar
        search={search}
        onSearch={setSearch}
        searchRef={searchRef}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onOpen={open}
        onHome={() => setTab("all")}
      />

      {isGuest && guestBanner && (
        <div className="guest-banner">
          <span>
            👋 Tu utilises LovaTasks <strong>sans compte</strong> : tout est enregistré dans ce navigateur.
          </span>
          <button className="btn btn-sm btn-primary" onClick={() => open("auth")}>Synchroniser avec un compte gratuit</button>
          <button className="icon-btn icon-btn--sm" aria-label="Masquer" onClick={() => setGuestBanner(false)}>✕</button>
        </div>
      )}

      <ProjectTabs
        active={activeTab}
        onChange={(id) => {
          setTab(id);
          setFocusMap(null);
        }}
        onNewProject={() => open("newProject")}
        onEditProject={(p) => open("project", p.id)}
        counts={counts}
      />

      <main className="workspace">
        <QuickAdd
          defaultProjectId={currentProject?.id ?? null}
          defaultHorizon={horizon === "long" ? "long" : "short"}
          inputRef={quickAddRef}
        />

        <div className="horizon-tabs" role="group" aria-label="Horizon">
          <button
            className={`horizon-tab${horizon === "all" ? " active" : ""}`}
            aria-pressed={horizon === "all"}
            onClick={() => setHorizon("all")}
            title="Toutes les tâches (H)"
          >
            <strong>Tout</strong>
            <span>{facets.byHorizon.short + facets.byHorizon.long}</span>
          </button>
          {HORIZONS.map((h) => (
            <button
              key={h.value}
              className={`horizon-tab horizon-tab--${h.value}${horizon === h.value ? " active" : ""}`}
              aria-pressed={horizon === h.value}
              onClick={() => setHorizon((cur) => (cur === h.value ? "all" : h.value))}
              title={`${h.hint} (H)`}
            >
              <strong>{h.icon} {h.label}</strong>
              <span>{facets.byHorizon[h.value]}</span>
            </button>
          ))}
        </div>

        <div className="toolbar">
          <div className="seg seg--sm" role="group" aria-label="Affichage">
            <button className={view === "board" ? "active" : ""} onClick={() => setView("board")} title="Tableau (B)">▦ Tableau</button>
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} title="Liste (L)">☰ Liste</button>
          </div>
          <div className="filters" role="group" aria-label="Filtres">
            <button className={`filter${filters.today ? " active" : ""}`} aria-pressed={filters.today} onClick={() => setFilters((f) => ({ ...f, today: !f.today }))}>
              ☀️ Aujourd'hui
            </button>
            <button className={`filter${filters.urgent ? " active" : ""}`} aria-pressed={filters.urgent} onClick={() => setFilters((f) => ({ ...f, urgent: !f.urgent }))}>
              🚩 Prioritaires
            </button>
            <button className={`filter${filters.hideDone ? " active" : ""}`} aria-pressed={filters.hideDone} onClick={() => setFilters((f) => ({ ...f, hideDone: !f.hideDone }))}>
              🙈 Masquer terminées
            </button>
            {(facets.labels.length > 0 || labelFilter) && (
              <select
                className={`filter filter-select${labelFilter ? " active" : ""}`}
                value={labelFilter ?? ""}
                onChange={(e) => setLabelFilter(e.target.value || null)}
                aria-label="Filtrer par étiquette"
              >
                <option value="">🏷️ Étiquettes</option>
                {facets.labels.map(([l, n]) => (
                  <option key={l} value={l}>#{l} ({n})</option>
                ))}
                {labelFilter && !facets.labels.some(([l]) => l === labelFilter) && (
                  <option value={labelFilter}>#{labelFilter} (0)</option>
                )}
              </select>
            )}
          </div>
          <label className="sort-select">
            <span className="muted small">Trier</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier les tâches">
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          {view === "list" && (
            <label className="sort-select">
              <span className="muted small">Grouper</span>
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} aria-label="Regrouper la liste">
                {GROUP_BY.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </label>
          )}
          <button className="btn btn-sm btn-ai" onClick={planDay} disabled={planning}>
            {planning ? "Réflexion…" : "✨ Ma journée"}
          </button>
          <div className="stats" aria-label="Statistiques">
            <span title="Tâches ouvertes">📋 {stats.open}</span>
            {stats.overdue > 0 && <span className="stat-overdue" title="En retard">⚠️ {stats.overdue}</span>}
            <span title="Terminées aujourd'hui">✅ {stats.doneToday} auj.</span>
            <span className="stat-progress" title="Avancement">
              <span className="meter meter--inline"><span style={{ width: `${stats.progress}%` }} /></span>
              {stats.progress}%
            </span>
          </div>
        </div>

        {labelFilter && (
          <div className="label-banner">
            <span>
              Filtré sur l'étiquette{" "}
              <span className="chip chip-label" style={{ "--chip": labelColor(labelFilter) }}>#{labelFilter}</span>
            </span>
            <button className="link" onClick={() => setLabelFilter(null)}>Retirer le filtre</button>
          </div>
        )}

        {focusMap && (
          <div className="focus-banner">
            <span>✨ L'IA a sélectionné <strong>{Object.keys(focusMap).length} tâche(s)</strong> pour aujourd'hui — elles sont surlignées.</span>
            <button className="link" onClick={() => setFocusMap(null)}>Effacer</button>
          </div>
        )}

        {!loaded ? (
          <div className="loading"><span className="spinner" /> Chargement de tes tâches…</div>
        ) : isEmpty ? (
          <section className="welcome">
            <h2>Bienvenue sur <span className="brand-lova">Lova</span>Tasks 👋</h2>
            <p>Organise tes projets pro et perso, simplement. Pas besoin de compte pour commencer.</p>
            <div className="welcome-actions">
              <button className="welcome-card" onClick={() => quickAddRef.current?.focus()}>
                <span>✍️</span>
                <strong>Ajouter une tâche</strong>
                <span className="muted small">Tape son nom et Entrée. Date du jour par défaut.</span>
              </button>
              <button className="welcome-card" onClick={() => open("newProject")}>
                <span>📁</span>
                <strong>Créer un projet</strong>
                <span className="muted small">Un onglet par projet, avec ses propres états.</span>
              </button>
              <button className="welcome-card welcome-card--ai" onClick={() => open("ai")}>
                <span>✨</span>
                <strong>Projet généré par l'IA</strong>
                <span className="muted small">Depuis un cahier des charges, en 10 secondes.</span>
              </button>
            </div>
          </section>
        ) : view === "board" ? (
          <Board
            columns={columns}
            tasks={visible}
            mode={activeTab === "all" ? "all" : "project"}
            projectId={currentProject?.id}
            onOpen={openTask}
            focusMap={focusMap}
            onAddColumn={currentProject ? addColumn : null}
            sort={sort}
            onLabel={toggleLabel}
            activeLabel={labelFilter}
            defaults={inlineDefaults}
          />
        ) : visible.length ? (
          <ListView
            tasks={visible}
            onOpen={openTask}
            showProject={activeTab === "all"}
            focusMap={focusMap}
            groupBy={groupBy}
            sort={sort}
            onLabel={toggleLabel}
            activeLabel={labelFilter}
          />
        ) : (
          <p className="empty">
            Aucune tâche ici
            {search || filters.today || filters.urgent || horizon !== "all" || labelFilter ? " avec ces filtres" : ""}.
          </p>
        )}
      </main>

      <Footer onOpen={open} />
      {modals.map(renderModal)}
    </div>
  );
};

const App = () => {
  const boardToken = new URLSearchParams(window.location.search).get("board");
  if (boardToken) return <PublicBoard token={boardToken} />;

  return (
    <ToastProvider>
      <AuthProvider>
        <StoreProvider>
          <Workspace />
        </StoreProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
