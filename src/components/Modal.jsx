import { useEffect, useRef } from "react";

// Pile des modales ouvertes : Échap ne ferme que celle du dessus.
const openStack = [];

// Fenêtre modale accessible : Échap ou clic extérieur pour fermer.
const Modal = ({ title, onClose, children, size = "md", footer, className = "" }) => {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const token = {};
    openStack.push(token);
    const onKey = (e) => {
      if (e.key === "Escape" && openStack[openStack.length - 1] === token) {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.activeElement;
    dialogRef.current?.focus();
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      openStack.splice(openStack.indexOf(token), 1);
      if (!openStack.length) document.body.classList.remove("no-scroll");
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className={`modal modal--${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
