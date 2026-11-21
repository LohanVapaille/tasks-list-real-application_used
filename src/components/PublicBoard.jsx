import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { PRIORITIES, formatDue } from "../lib/utils";
import Brand from "./Brand";

// Portail client : tableau en lecture seule accessible via ?board=<token>.
const PublicBoard = ({ token }) => {
  const [board, setBoard] = useState(undefined);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_public_board", { token });
      if (alive) setBoard(data ?? null);
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [token]);

  if (board === undefined) return <div className="public-loading">Chargement…</div>;

  if (!board) {
    return (
      <div className="public-empty">
        <Brand onClick={() => (window.location.href = import.meta.env.BASE_URL)} />
        <p>Ce lien n'est plus actif. Demande un nouveau lien à la personne qui te l'a envoyé.</p>
      </div>
    );
  }

  const { project, tasks } = board;
  const doneIds = new Set(project.columns.filter((c) => c.kind === "done").map((c) => c.id));
  const progress = tasks.length ? Math.round((tasks.filter((t) => doneIds.has(t.status)).length / tasks.length) * 100) : 0;

  return (
    <div className="public">
      <header className="public-head" style={{ "--accent": project.color }}>
        <div>
          <p className="muted small">Suivi de projet</p>
          <h1>{project.icon} {project.name}</h1>
        </div>
        <div className="public-progress">
          <strong>{progress}%</strong>
          <div className="meter"><div style={{ width: `${progress}%` }} /></div>
          <span className="muted small">{tasks.length} tâches · mis à jour en direct</span>
        </div>
      </header>
      <div className="board board--readonly">
        {project.columns.map((c) => {
          const list = tasks.filter((t) => t.status === c.id);
          return (
            <section key={c.id} className={`column kind-${c.kind}`}>
              <header className="column-head">
                <span className="column-dot" />
                <h3>{c.name}</h3>
                <span className="column-count">{list.length}</span>
              </header>
              <div className="column-body">
                {list.map((t) => {
                  const done = (t.checklist ?? []).filter((i) => i.done).length;
                  return (
                    <div key={t.id} className={`card prio-${t.priority}${c.kind === "done" ? " is-done" : ""}`}>
                      <div className="card-top">
                        <span className="card-title">{t.title}</span>
                        {t.priority > 0 && <span className={`prio-flag prio-flag--${t.priority}`}>{PRIORITIES[t.priority].short}</span>}
                      </div>
                      <div className="card-meta">
                        {t.due_date && <span className="chip">📅 {formatDue(t.due_date)}</span>}
                        {t.checklist?.length > 0 && <span className="chip">☑ {done}/{t.checklist.length}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <footer className="public-foot">
        Propulsé par <a href={import.meta.env.BASE_URL}>LovaTasks</a> — une application Lova par{" "}
        <a href="https://lovaweb.fr" target="_blank" rel="noopener">Lovaweb</a>
      </footer>
    </div>
  );
};

export default PublicBoard;
