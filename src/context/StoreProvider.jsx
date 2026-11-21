// Données de l'application (projets + tâches).
// - Invité : tout est gardé dans le localStorage du navigateur.
// - Connecté : tout est dans Supabase, synchronisé en temps réel.
// À la connexion, les données invitées sont envoyées dans le compte puis effacées localement.
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { newTask } from "../lib/tasks";
import { DEFAULT_COLUMNS, uid } from "../lib/utils";
import { StoreContext, useAuth, useToast } from "./contexts";

const GUEST_KEY = "lovatasks:guest";
const LEGACY_KEY = "mes-notes"; // v1 de l'application

const PROJECT_FIELDS = ["id", "name", "color", "icon", "columns", "position", "archived"];
const TASK_FIELDS = [
  "id", "project_id", "title", "description", "status", "priority", "due_date", "labels",
  "checklist", "position", "time_spent", "timer_started_at", "completed_at", "created_at",
];
const pick = (obj, fields) =>
  Object.fromEntries(fields.filter((f) => obj[f] !== undefined).map((f) => [f, obj[f]]));

const readGuest = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(GUEST_KEY) || "null");
    if (saved) return { projects: saved.projects ?? [], tasks: saved.tasks ?? [] };

    // Reprise des tâches de la v1 (localStorage "mes-notes").
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
    if (Array.isArray(legacy)) {
      return {
        projects: [],
        tasks: legacy.map((n) => ({
          ...newTask({ title: n.text, due_date: n.date || null }),
          status: n.completed ? "done" : "todo",
          labels: [n.category === "long" ? "long terme" : "rapide"],
          position: -Number(n.id) || 0,
        })),
      };
    }
  } catch {
    // Stockage illisible ou bloqué : on repart de zéro.
  }
  return { projects: [], tasks: [] };
};

const hasGuestData = () => {
  const { projects, tasks } = readGuest();
  return projects.length > 0 || tasks.length > 0;
};

const clearGuest = () => {
  try {
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignoré
  }
};


const reducer = (state, action) => {
  switch (action.type) {
    case "SET":
      return { ...state, ...action.payload, loaded: true };
    case "RESET":
      return { projects: [], tasks: [], loaded: false, mode: null };
    case "UPSERT_PROJECT": {
      const exists = state.projects.some((p) => p.id === action.payload.id);
      return {
        ...state,
        projects: exists
          ? state.projects.map((p) => (p.id === action.payload.id ? { ...p, ...action.payload } : p))
          : [...state.projects, action.payload],
      };
    }
    case "REMOVE_PROJECT":
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.payload),
        tasks: state.tasks.filter((t) => t.project_id !== action.payload),
      };
    case "ADD_TASKS":
      return { ...state, tasks: [...action.payload, ...state.tasks] };
    case "PATCH_TASKS": {
      const patches = new Map(action.payload.map((p) => [p.id, p]));
      return {
        ...state,
        tasks: state.tasks.map((t) => (patches.has(t.id) ? { ...t, ...patches.get(t.id) } : t)),
      };
    }
    case "REMOVE_TASKS": {
      const ids = new Set(action.payload);
      return { ...state, tasks: state.tasks.filter((t) => !ids.has(t.id)) };
    }
    default:
      return state;
  }
};

const StoreProvider = ({ children }) => {
  const { session } = useAuth();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(reducer, { projects: [], tasks: [], loaded: false, mode: null });
  const userId = session?.user.id;
  const isGuest = session === null;
  const fetchId = useRef(0);

  // ── Lecture distante ──────────────────────────────────────
  const fetchRemote = useCallback(async () => {
    const id = ++fetchId.current;
    const [projects, tasks] = await Promise.all([
      supabase.from("projects").select("*").order("position").order("created_at"),
      supabase.from("tasks").select("*").order("position"),
    ]);
    if (id !== fetchId.current) return;
    const error = projects.error || tasks.error;
    if (error) {
      toast(`Synchronisation impossible : ${error.message}`, { type: "error" });
      return;
    }
    dispatch({ type: "SET", payload: { projects: projects.data, tasks: tasks.data, mode: "remote" } });
  }, [toast]);

  // ── Envoi des données invitées dans le compte ──────────────
  const migrateGuest = useCallback(async () => {
    if (!hasGuestData()) return;
    const { projects, tasks } = readGuest();
    if (projects.length) {
      const { error } = await supabase
        .from("projects")
        .upsert(projects.map((p) => pick(p, PROJECT_FIELDS)), { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }
    if (tasks.length) {
      const { error } = await supabase
        .from("tasks")
        .upsert(tasks.map((t) => pick(t, TASK_FIELDS)), { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }
    clearGuest();
    toast(`${tasks.length} tâche(s) et ${projects.length} projet(s) importés dans ton compte ✨`, {
      type: "success",
    });
  }, [toast]);

  // ── Chargement selon le mode ───────────────────────────────
  useEffect(() => {
    if (session === undefined) return undefined;
    dispatch({ type: "RESET" });

    if (isGuest) {
      dispatch({ type: "SET", payload: { ...readGuest(), mode: "guest" } });
      return undefined;
    }

    let cancelled = false;
    let timer;
    const fetchCounter = fetchId;
    const refetchSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(fetchRemote, 250);
    };

    (async () => {
      try {
        await migrateGuest();
      } catch (error) {
        toast(`Tes tâches locales n'ont pas pu être importées : ${error.message}`, { type: "error" });
      }
      const { data: joined } = await supabase.rpc("accept_invites");
      if (joined > 0 && !cancelled) toast(`Tu as rejoint ${joined} projet(s) partagé(s) 🎉`, { type: "success" });
      if (!cancelled) fetchRemote();
    })();

    const channel = supabase
      .channel(`lovatasks-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetchSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, refetchSoon)
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") refetchSoon();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      fetchCounter.current++;
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session, isGuest, userId, fetchRemote, migrateGuest, toast]);

  // ── Sauvegarde locale (invité) ─────────────────────────────
  useEffect(() => {
    // mode "guest" : n'écrit jamais les données d'un compte dans le navigateur.
    if (!isGuest || state.mode !== "guest") return;
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify({ projects: state.projects, tasks: state.tasks }));
    } catch {
      // Stockage plein ou bloqué
    }
  }, [isGuest, state]);

  // Exécute une écriture distante ; en cas d'échec on réaligne sur la base.
  const remote = useCallback(
    async (request) => {
      if (isGuest) return true;
      const { error } = await request;
      if (error) {
        toast(`Modification non enregistrée : ${error.message}`, { type: "error" });
        fetchRemote();
        return false;
      }
      return true;
    },
    [isGuest, toast, fetchRemote],
  );

  // ── Helpers de lecture ─────────────────────────────────────
  const projectsById = useMemo(
    () => new Map(state.projects.map((p) => [p.id, p])),
    [state.projects],
  );

  const columnsFor = useCallback(
    (projectId) => (projectId && projectsById.get(projectId)?.columns) || DEFAULT_COLUMNS,
    [projectsById],
  );

  const kindOf = useCallback(
    (task) => columnsFor(task.project_id).find((c) => c.id === task.status)?.kind ?? "todo",
    [columnsFor],
  );

  // ── Tâches ─────────────────────────────────────────────────
  const withCompletion = useCallback(
    (task, patch) => {
      if (patch.status === undefined && patch.project_id === undefined) return patch;
      const next = { ...task, ...patch };
      const done = kindOf(next) === "done";
      if (done && !task.completed_at) return { ...patch, completed_at: new Date().toISOString() };
      if (!done && task.completed_at) return { ...patch, completed_at: null };
      return patch;
    },
    [kindOf],
  );

  const addTask = useCallback(
    (fields) => {
      const columns = columnsFor(fields.project_id);
      const task = newTask({ status: columns[0].id, ...fields });
      dispatch({ type: "ADD_TASKS", payload: [task] });
      remote(supabase.from("tasks").insert(pick(task, TASK_FIELDS)));
      return task;
    },
    [columnsFor, remote],
  );

  const addTasks = useCallback(
    (list) => {
      const tasks = list.map((fields) => newTask(fields));
      dispatch({ type: "ADD_TASKS", payload: tasks });
      return remote(supabase.from("tasks").insert(tasks.map((t) => pick(t, TASK_FIELDS))));
    },
    [remote],
  );

  const updateTask = useCallback(
    (id, rawPatch) => {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return;
      const patch = withCompletion(task, rawPatch);
      dispatch({ type: "PATCH_TASKS", payload: [{ id, ...patch }] });
      remote(supabase.from("tasks").update(patch).eq("id", id));
    },
    [state.tasks, withCompletion, remote],
  );

  const deleteTask = useCallback(
    (id) => {
      const task = state.tasks.find((t) => t.id === id);
      if (!task) return;
      dispatch({ type: "REMOVE_TASKS", payload: [id] });
      remote(supabase.from("tasks").delete().eq("id", id));
      toast(`« ${task.title} » supprimée`, {
        action: {
          label: "Annuler",
          onClick: () => {
            dispatch({ type: "ADD_TASKS", payload: [task] });
            remote(supabase.from("tasks").insert(pick(task, TASK_FIELDS)));
          },
        },
      });
    },
    [state.tasks, remote, toast],
  );

  const toggleDone = useCallback(
    (task) => {
      const columns = columnsFor(task.project_id);
      const isDone = kindOf(task) === "done";
      const target = isDone
        ? columns.find((c) => c.kind === "todo") ?? columns[0]
        : columns.find((c) => c.kind === "done") ?? columns[columns.length - 1];
      updateTask(task.id, { status: target.id });
    },
    [columnsFor, kindOf, updateTask],
  );

  const startTimer = useCallback(
    (task) => {
      // Un seul chrono à la fois : on arrête les autres.
      const running = state.tasks.filter((t) => t.timer_started_at && t.id !== task.id);
      running.forEach((t) => {
        const elapsed = (Date.now() - new Date(t.timer_started_at).getTime()) / 1000;
        updateTask(t.id, { timer_started_at: null, time_spent: Math.round(t.time_spent + elapsed) });
      });
      updateTask(task.id, { timer_started_at: new Date().toISOString() });
    },
    [state.tasks, updateTask],
  );

  const stopTimer = useCallback(
    (task) => {
      if (!task.timer_started_at) return;
      const elapsed = (Date.now() - new Date(task.timer_started_at).getTime()) / 1000;
      updateTask(task.id, { timer_started_at: null, time_spent: Math.round(task.time_spent + elapsed) });
    },
    [updateTask],
  );

  // ── Projets ────────────────────────────────────────────────
  const addProject = useCallback(
    async (fields) => {
      const project = {
        id: uid(),
        name: "Nouveau projet",
        color: "#e8730d",
        icon: "📁",
        columns: DEFAULT_COLUMNS,
        position: state.projects.length,
        archived: false,
        owner_id: userId ?? null,
        public_token: null,
        created_at: new Date().toISOString(),
        ...fields,
      };
      dispatch({ type: "UPSERT_PROJECT", payload: project });
      const ok = await remote(supabase.from("projects").insert(pick(project, PROJECT_FIELDS)));
      return ok ? project : null;
    },
    [state.projects.length, userId, remote],
  );

  const updateProject = useCallback(
    (id, patch) => {
      dispatch({ type: "UPSERT_PROJECT", payload: { id, ...patch } });
      remote(supabase.from("projects").update(patch).eq("id", id));
    },
    [remote],
  );

  const deleteProject = useCallback(
    (id) => {
      dispatch({ type: "REMOVE_PROJECT", payload: id });
      remote(supabase.from("projects").delete().eq("id", id));
    },
    [remote],
  );

  // Supprime une colonne : ses tâches partent dans la première colonne restante.
  const deleteColumn = useCallback(
    (projectId, columnId) => {
      const project = projectsById.get(projectId);
      if (!project || project.columns.length <= 1) return;
      const columns = project.columns.filter((c) => c.id !== columnId);
      const fallback = columns[0].id;
      const moved = state.tasks
        .filter((t) => t.project_id === projectId && t.status === columnId)
        .map((t) => ({ id: t.id, status: fallback }));
      dispatch({ type: "PATCH_TASKS", payload: moved });
      updateProject(projectId, { columns });
      if (moved.length) {
        remote(
          supabase.from("tasks").update({ status: fallback }).eq("project_id", projectId).eq("status", columnId),
        );
      }
    },
    [projectsById, state.tasks, updateProject, remote],
  );

  // Import JSON (sauvegarde exportée depuis LovaTasks).
  const importBackup = useCallback(
    async (backup) => {
      const idMap = new Map();
      const projects = (backup.projects ?? []).map((p, i) => {
        const id = uid();
        idMap.set(p.id, id);
        return { ...pick(p, PROJECT_FIELDS), id, position: state.projects.length + i };
      });
      const tasks = (backup.tasks ?? []).map((t) =>
        newTask({ ...pick(t, TASK_FIELDS), id: uid(), project_id: idMap.get(t.project_id) ?? null }),
      );
      projects.forEach((p) => dispatch({ type: "UPSERT_PROJECT", payload: p }));
      dispatch({ type: "ADD_TASKS", payload: tasks });
      if (!isGuest) {
        if (projects.length) await remote(supabase.from("projects").insert(projects));
        if (tasks.length) await remote(supabase.from("tasks").insert(tasks.map((t) => pick(t, TASK_FIELDS))));
      }
      return { projects: projects.length, tasks: tasks.length };
    },
    [state.projects.length, isGuest, remote],
  );

  const value = {
    loaded: state.loaded && state.mode === (isGuest ? "guest" : "remote"),
    isGuest,
    projects: state.projects,
    tasks: state.tasks,
    projectsById,
    columnsFor,
    kindOf,
    addTask,
    addTasks,
    updateTask,
    deleteTask,
    toggleDone,
    startTimer,
    stopTimer,
    addProject,
    updateProject,
    deleteProject,
    deleteColumn,
    importBackup,
    refresh: fetchRemote,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export default StoreProvider;
