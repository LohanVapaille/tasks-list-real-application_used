// Petites fonctions utilitaires partagées.

export const uid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
      );

export const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const todayISO = () => toISODate(new Date());

export const addDays = (iso, days) => {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
};

const DAY_NAMES = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

// "Aujourd'hui", "Demain", "Hier", "lun. 24/11"...
export const formatDue = (iso) => {
  if (!iso) return "";
  const today = todayISO();
  if (iso === today) return "Aujourd'hui";
  if (iso === addDays(today, 1)) return "Demain";
  if (iso === addDays(today, -1)) return "Hier";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = y === new Date().getFullYear();
  return `${DAY_NAMES[date.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}${sameYear ? "" : `/${y}`}`;
};

export const dueState = (iso, done) => {
  if (!iso || done) return "";
  const today = todayISO();
  if (iso < today) return "overdue";
  if (iso === today) return "today";
  return "";
};

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h} h ${String(m).padStart(2, "0")}`;
  if (m) return `${m} min`;
  return `${s % 60} s`;
};

export const PRIORITIES = [
  { value: 0, label: "Aucune", short: "" },
  { value: 1, label: "Basse", short: "P3" },
  { value: 2, label: "Haute", short: "P2" },
  { value: 3, label: "Urgente", short: "P1" },
];

export const PROJECT_COLORS = [
  "#e8730d",
  "#0f7c74",
  "#0c3d58",
  "#ffa630",
  "#4338ca",
  "#be185d",
  "#15803d",
  "#64748b",
];

export const PROJECT_ICONS = ["📁", "🚀", "💼", "🏠", "🎯", "🛠️", "📚", "✈️", "💡", "🎨", "💪", "🧾"];

export const DEFAULT_COLUMNS = [
  { id: "todo", name: "À faire", kind: "todo" },
  { id: "doing", name: "En cours", kind: "doing" },
  { id: "done", name: "Terminé", kind: "done" },
];

export const KIND_LABELS = { todo: "À faire", doing: "En cours", done: "Terminé" };

export const downloadFile = (filename, content, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const toCSV = (rows) =>
  "﻿" +
  rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell == null ? "" : String(cell);
          return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(";"),
    )
    .join("\n");
