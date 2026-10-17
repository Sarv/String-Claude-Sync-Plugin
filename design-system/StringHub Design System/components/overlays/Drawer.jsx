import React from "react";
/** Slide-over for one record in the context of its list. */
export function Drawer({ open, onClose, size, icon, title, subtitle, headerActions, stats, tabs, children, footer }) {
  if (!open) return null;
  return <div className="drawer-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
    <aside className={"drawer" + (size ? " " + size : "")} role="dialog" aria-modal="true">
      <div className="drawer-head">{icon ? <div className="icon"><i className={"bx bx-" + icon + " icon-18"} aria-hidden="true"></i></div> : null}
        <div className="titles"><div className="t">{title}</div>{subtitle ? <div className="sub">{subtitle}</div> : null}</div>{headerActions}
        <button className="btn-close" aria-label="Close" onClick={onClose}><i className="bx bx-x icon-16" aria-hidden="true"></i></button></div>
      {stats ? <div className="drawer-stats">{stats.map((s, i) => <div key={i}><div className="k">{s.k}</div><div className="v">{s.v}</div></div>)}</div> : null}
      {tabs ? <div className="drawer-tabs">{tabs}</div> : null}
      <div className="drawer-body">{children}</div>
      {footer ? <div className="drawer-foot">{footer}</div> : null}
    </aside></div>;
}
