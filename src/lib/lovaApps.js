// Applications Lova chargées depuis le back-office Lovaweb (table `lova_apps`).
// Source : GET {LOVA_API_URL}/api/lova-apps. En cas d'échec, on garde le dernier
// résultat mis en cache, sinon la liste de secours de config/lova.js.
import { useEffect, useState } from "react";
import { APP_SLUG, LOVA_API_URL, LOVA_APPS_FALLBACK } from "../config/lova";

const CACHE_KEY = "lova:apps:v1";
const CACHE_TTL = 10 * 60 * 1000; // 10 min avant de redemander à l'API

// Format unique utilisé par les composants, quelle que soit la source.
const normalize = (app) => ({
  slug: app.slug,
  name: app.name,
  url: app.url || null,
  logo: app.logo_url || null,
  color: app.accent_color || "#4f46e5",
  monogram: app.monogram || app.name.replace(/^lova\s*/i, "").slice(0, 2),
  description: app.tagline || app.category || "",
  statusLabel: app.status_label || null,
  available: Boolean(app.is_available && app.url),
  current: app.slug === APP_SLUG,
});

const fallback = () => LOVA_APPS_FALLBACK.map(normalize);

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCache = (apps) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), apps }));
  } catch {
    /* stockage indisponible : pas grave */
  }
};

let request = null; // une seule requête partagée par le lanceur et le footer

const fetchApps = () => {
  request ??= fetch(`${LOVA_API_URL}/api/lova-apps`, { headers: { Accept: "application/json" } })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then(({ data }) => {
      writeCache(data);
      return data.map(normalize);
    })
    .catch((err) => {
      console.warn("[lova] apps indisponibles, liste de secours utilisée :", err.message);
      request = null;
      return null;
    });
  return request;
};

export const useLovaApps = () => {
  const [apps, setApps] = useState(() => {
    const cached = readCache();
    return cached ? cached.apps.map(normalize) : fallback();
  });

  useEffect(() => {
    const cached = readCache();
    if (cached && Date.now() - cached.at < CACHE_TTL) return undefined;
    let alive = true;
    fetchApps().then((fresh) => alive && fresh && setApps(fresh));
    return () => {
      alive = false;
    };
  }, []);

  return apps;
};
