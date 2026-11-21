import { useAuth } from "../context/contexts";
import AppLauncher from "./AppLauncher";
import Brand from "./Brand";
import UserMenu from "./UserMenu";

const TopBar = ({ search, onSearch, searchRef, theme, onToggleTheme, onOpen, onHome }) => {
  const { isPro } = useAuth();

  return (
    <header className="topbar">
      <Brand onClick={onHome} />

      <div className="search">
        <span aria-hidden="true">🔍</span>
        <input
          ref={searchRef}
          type="search"
          placeholder="Rechercher une tâche, une étiquette…  ( / )"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Rechercher"
        />
      </div>

      <div className="topbar-actions">
        {!isPro && (
          <button className="btn btn-pro btn-sm hide-sm" onClick={() => onOpen("pricing")}>
            ⭐ Pro
          </button>
        )}
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
          title={theme === "dark" ? "Mode clair" : "Mode sombre"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <AppLauncher />
        <UserMenu onOpen={onOpen} />
      </div>
    </header>
  );
};

export default TopBar;
