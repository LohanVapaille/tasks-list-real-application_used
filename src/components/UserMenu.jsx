import { useEffect, useRef, useState } from "react";
import { PRICING } from "../config/lova";
import { useAuth } from "../context/contexts";

const Avatar = ({ url, name, size = 34 }) =>
  url ? (
    <img className="avatar" src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="avatar avatar--letter" style={{ width: size, height: size }}>
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );

export { Avatar };

const UserMenu = ({ onOpen }) => {
  const { user, profile, isPro, displayName, avatarUrl, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const go = (what) => {
    setOpen(false);
    onOpen(what);
  };

  if (!user) {
    return (
      <div className="user-menu" ref={ref}>
        <button className="btn btn-primary btn-sm hide-xs" onClick={() => onOpen("auth")}>
          Se connecter
        </button>
        <button className="avatar-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu invité">
          <span className="avatar avatar--letter avatar--guest">👤</span>
        </button>
        {open && (
          <div className="dropdown" role="menu">
            <div className="dropdown-note">
              Mode invité : tes tâches sont enregistrées <strong>dans ce navigateur</strong>. Crée un
              compte gratuit pour les retrouver partout et partager tes projets.
            </div>
            <button role="menuitem" onClick={() => go("auth")}>🔐 Se connecter / créer un compte</button>
            <button role="menuitem" onClick={() => go("pricing")}>⭐ Découvrir Pro</button>
            <button role="menuitem" onClick={() => go("data")}>💾 Exporter / importer</button>
            <button role="menuitem" onClick={() => go("shortcuts")}>⌨️ Raccourcis clavier</button>
          </div>
        )}
      </div>
    );
  }

  const period = new Date().toISOString().slice(0, 7);
  const aiUsed = profile?.ai_period === period ? profile.ai_used : 0;
  const aiQuota = isPro ? PRICING.proAiQuota : PRICING.freeAiQuota;

  return (
    <div className="user-menu" ref={ref}>
      <button className="avatar-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Mon compte">
        <Avatar url={avatarUrl} name={displayName} />
        {isPro && <span className="avatar-pro">PRO</span>}
      </button>
      {open && (
        <div className="dropdown" role="menu">
          <div className="dropdown-head">
            <Avatar url={avatarUrl} name={displayName} size={44} />
            <div>
              <strong>{displayName}</strong>
              <span>{user.email}</span>
              <span className={`plan-chip ${isPro ? "plan-chip--pro" : ""}`}>{isPro ? "LovaTasks Pro" : "Plan gratuit"}</span>
            </div>
          </div>
          <div className="dropdown-meter">
            <span>✨ IA ce mois-ci</span>
            <span>
              {aiUsed} / {aiQuota}
            </span>
            <div className="meter">
              <div style={{ width: `${Math.min(100, (aiUsed / aiQuota) * 100)}%` }} />
            </div>
          </div>
          <button role="menuitem" onClick={() => go("pricing")}>
            {isPro ? "💳 Gérer mon abonnement" : "⭐ Passer à Pro"}
          </button>
          <button role="menuitem" onClick={() => go("time")}>⏱️ Rapport de temps</button>
          <button role="menuitem" onClick={() => go("data")}>💾 Exporter / importer</button>
          <button role="menuitem" onClick={() => go("shortcuts")}>⌨️ Raccourcis clavier</button>
          <button
            role="menuitem"
            className="danger"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
