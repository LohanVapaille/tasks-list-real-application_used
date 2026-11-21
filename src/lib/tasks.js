import { uid } from "./utils";

// Tâche vide avec toutes les valeurs par défaut.
export const newTask = (fields = {}) => ({
  id: uid(),
  project_id: null,
  title: "",
  description: "",
  status: "todo",
  priority: 0,
  due_date: null,
  labels: [],
  checklist: [],
  position: -Date.now(),
  time_spent: 0,
  timer_started_at: null,
  completed_at: null,
  created_at: new Date().toISOString(),
  ...fields,
});
