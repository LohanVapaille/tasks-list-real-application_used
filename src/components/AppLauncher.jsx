import { useEffect, useRef, useState } from "react";
import { LOVA_APPS } from "../config/lova";
import lovaLogo from "../assets/logo_lova.jpg";
import tasksLogo from "../assets/logo_lovatasks.png";

const APP_LOGOS = { lovaweb: lovaLogo, lovatasks: tasksLogo };

// Lanceur des applications Lova (comme la grille "Applications Google").
const AppLauncher = () => {
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
            {LOVA_APPS.map((app) => (
              <a
                key={app.id}
                href={app.url}
                role="menuitem"
                className={`launcher-app${app.current ? " current" : ""}`}
                target={app.current ? undefined : "_blank"}
                rel="noopener"
                onClick={app.current ? (e) => { e.preventDefault(); setOpen(false); } : undefined}
              >
                {APP_LOGOS[app.id] ? (
                  <img className="launcher-icon" src={APP_LOGOS[app.id]} alt="" />
                ) : (
                  <span className="launcher-icon" style={{ background: app.color }}>
                    {app.letter}
                  </span>
                )}
                <span className="launcher-name">{app.name}</span>
                <span className="launcher-desc">{app.description}</span>
              </a>
            ))}
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
