import React from "react";
/** Modal dialog. size sm = confirm, md = form, lg = long content. Closes on backdrop click / Esc. */
export function Modal({ open, onClose, size = "md", icon, tone, title, description, children, footer }) {
  React.useEffect(() => { if (!open) return; const k = (e) => e.key === "Escape" && onClose && onClose(); document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [open, onClose]);
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
    <div className={"card modal-dialog modal-" + size} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
      <div className="modal-head">{icon ? <div className={"ico" + (tone ? " " + tone : "")}><i className={"bx bx-" + icon + " icon-18"} aria-hidden="true"></i></div> : null}
        <div className="text"><h4>{title}</h4>{description ? <p>{description}</p> : null}</div>
        <button className="close" aria-label="Close" onClick={onClose}><i className="bx bx-x icon-16" aria-hidden="true"></i></button></div>
      {children ? <div className="modal-body">{children}</div> : null}
      {footer ? <div className="modal-foot">{footer}</div> : null}
    </div></div>;
}
