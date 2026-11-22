import { useEffect, useRef, useState } from "react";
import { useLovaApps } from "../lib/lovaApps";
import lovaLogo from "../assets/logo_lova.jpg";
import tasksLogo from "../assets/logo_lovatasks.png";

// Logos embarqués, utilisés si l'API ne fournit pas de logo.
const LOCAL_LOGOS = { lovatasks: tasksLogo };

const AppIcon = ({ app }) => {
  const [broken, setBroken] = useState(false);
  const src = (!broken && app.logo) || LOCAL_LOGOS[app.slug];
  return src ? (
    <img className="launcher-icon" src={src} alt="" onError={() => setBroken(true)} />
  ) : (
    <span className="launcher-icon" style={{ background: app.color }}>
      {app.monogram}
    </span>
  );
};

// Lanceur des applications Lova (comme la grille "Applications Google").
// La liste vient du back-office Lovaweb : voir src/lib/lovaApps.js.
const AppLauncher = () => {
  const apps = useLovaApps();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="launcher" ref={ref}>
      <button
        className="icon-btn launcher-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Applications Lova"
        title="Applications Lova"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          {[4, 12, 20].flatMap((y) =>
            [4, 12, 20].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="currentColor" />),
          )}
        </svg>
      </button>

      {open && (
        <div className="launcher-panel" role="menu">
          <div className="launcher-head">
            <img src={lovaLogo} alt="" width="28" height="28" />
            <div>
              <strong>Applications Lova</strong>
              <span>Un compte, tous vos outils</span>
            </div>
          </div>
          <div className="launcher-grid">
            {apps.map((app) =>
              app.current || app.available ? (
                <a
                  key={app.slug}
                  href={app.current ? undefined : app.url}
                  role="menuitem"
                  className={`launcher-app${app.current ? " current" : ""}`}
                  target={app.current ? undefined : "_blank"}
                  rel="noopener"
                  onClick={app.current ? (e) => { e.preventDefault(); setOpen(false); } : undefined}
                >
                  <AppIcon app={app} />
                  <span className="launcher-name">{app.name}</span>
                  <span className="launcher-desc">{app.description}</span>
                </a>
              ) : (
                <div key={app.slug} className="launcher-app soon" aria-disabled="true">
                  <AppIcon app={app} />
                  <span className="launcher-name">{app.name}</span>
                  <span className="launcher-desc">{app.statusLabel || "Bientôt"}</span>
                </div>
              ),
            )}
          </div>
          <a className="launcher-foot" href="https://lovaweb.fr" target="_blank" rel="noopener">
            Découvrir l'écosystème Lova →
          </a>
        </div>
      )}
    </div>
  );
};

export default AppLauncher;
