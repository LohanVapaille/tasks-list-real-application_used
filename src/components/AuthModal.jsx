import { useState } from "react";
import { useAuth, useStore } from "../context/contexts";
import Modal from "./Modal";

const errorMessage = (error) => {
  if (error.code === "invalid_credentials") return "E-mail ou mot de passe incorrect.";
  if (error.code === "user_already_exists") return "Un compte existe déjà avec cet e-mail.";
  if (error.code === "weak_password") return "Mot de passe trop faible (6 caractères minimum).";
  if (error.code === "email_not_confirmed") return "Confirme d'abord ton adresse depuis l'e-mail reçu.";
  return error.message;
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const AuthModal = ({ onClose, reason }) => {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const { tasks, projects } = useStore();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const localCount = tasks.length + projects.length;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    const cleanEmail = email.trim();
    let result;
    if (mode === "reset") result = await resetPassword(cleanEmail);
    else if (mode === "signup") result = await signUp(cleanEmail, password);
    else result = await signIn(cleanEmail, password);
    setBusy(false);

    if (result.error) return setError(errorMessage(result.error));
    if (mode === "reset") return setInfo("E-mail envoyé : suis le lien pour choisir un nouveau mot de passe.");
    if (mode === "signup" && !result.data.session) {
      return setInfo("Compte créé ! Confirme ton adresse depuis l'e-mail reçu, puis connecte-toi.");
    }
    onClose();
  };

  const google = async () => {
    setError("");
    const { error: oauthError } = await signInWithGoogle();
    if (oauthError) setError(errorMessage(oauthError));
  };

  const titles = { signin: "Connexion", signup: "Créer un compte", reset: "Mot de passe oublié" };

  return (
    <Modal title={titles[mode]} onClose={onClose} size="sm">
      {reason && <p className="auth-reason">{reason}</p>}

      {localCount > 0 && mode !== "reset" && (
        <p className="auth-local">
          📦 Tes {tasks.length} tâche(s) et {projects.length} projet(s) créés en mode invité seront
          automatiquement ajoutés à ton compte.
        </p>
      )}

      {mode !== "reset" && (
        <>
          <button type="button" className="btn btn-google" onClick={google}>
            <GoogleIcon /> Continuer avec Google
          </button>
          <div className="divider"><span>ou par e-mail</span></div>
        </>
      )}

      <form className="form" onSubmit={submit}>
        <label>
          E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {mode !== "reset" && (
          <label>
            Mot de passe
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        )}

        {error && <p className="form-error">{error}</p>}
        {info && <p className="form-info">{info}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "…" : mode === "signup" ? "Créer mon compte gratuit" : mode === "reset" ? "Envoyer le lien" : "Se connecter"}
        </button>
      </form>

      <div className="auth-links">
        {mode === "signin" && (
          <>
            <button className="link" onClick={() => setMode("signup")}>Pas de compte ? Créer un compte</button>
            <button className="link" onClick={() => setMode("reset")}>Mot de passe oublié</button>
          </>
        )}
        {mode !== "signin" && (
          <button className="link" onClick={() => setMode("signin")}>J'ai déjà un compte</button>
        )}
      </div>
      <p className="muted small center">
        Le compte est facultatif : sans compte, tout reste dans ce navigateur.
      </p>
    </Modal>
  );
};

export default AuthModal;
