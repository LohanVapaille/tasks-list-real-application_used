import logo from "../assets/logo_lovatasks.png";

// Logo officiel LovaTasks (dégradé orange + "Lova" manuscrit).
export const LogoMark = ({ size = 38 }) => (
  <img className="logo-mark" src={logo} alt="" width={size} height={size} />
);

const Brand = ({ onClick }) => (
  <button className="brand" onClick={onClick} aria-label="LovaTasks — accueil">
    <LogoMark />
    <span className="brand-text">
      <span className="brand-lova">Lova</span>
      <span className="brand-tasks">Tasks</span>
    </span>
  </button>
);

export default Brand;
