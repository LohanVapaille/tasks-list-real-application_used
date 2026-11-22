import { useLovaApps } from "../lib/lovaApps";
import lovaLogo from "../assets/logo_lova.jpg";

const Footer = ({ onOpen }) => {
  const apps = useLovaApps().filter((a) => a.available && !a.current);
  return (
  <footer className="footer">
    <div className="footer-brand">
      <img src={lovaLogo} alt="Lova" width="24" height="24" />
      <span>
        <strong>LovaTasks</strong> — une application{" "}
        <a href="https://lovaweb.fr" target="_blank" rel="noopener">Lova</a>, conçue par{" "}
        <a href="https://lovaweb.fr" target="_blank" rel="noopener">Lovaweb</a>
      </span>
    </div>

    <nav className="footer-apps" aria-label="Applications Lova">
      {apps.map((app) => (
        <a key={app.slug} href={app.url} target="_blank" rel="noopener">
          {app.name}
        </a>
      ))}
    </nav>

    <nav className="footer-links" aria-label="Informations légales">
      <button className="link" onClick={() => onOpen("legal:mentions")}>Mentions légales</button>
      <button className="link" onClick={() => onOpen("legal:privacy")}>Confidentialité</button>
      <button className="link" onClick={() => onOpen("legal:cgv")}>CGU / CGV</button>
      <button className="link" onClick={() => onOpen("legal:credits")}>Crédits</button>
      <span className="muted">© {new Date().getFullYear()} Lohan Vapaille</span>
    </nav>
  </footer>
  );
};

export default Footer;
