import React from "react";
/** Settings: 200px side nav (entity badge, group labels, violet active bar) + main. */
export function SettingsShell({ entity, nav = [], active, onNavigate, title, description, children }) {
  return <div className="settings-shell" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
    <nav className="settings-nav" aria-label="Settings">
      {entity ? <div className="settings-nav-entity"><span className="sne-mark">{entity.mark}</span><span className="sne-name">{entity.name}</span></div> : null}
      {nav.map((it, i) => it.group ? <div key={"g" + i} className="settings-nav-label">{it.group}</div> :
        <a key={it.id} className={"settings-nav-item" + (it.id === active ? " active" : "")} href="#" aria-current={it.id === active ? "page" : undefined} onClick={(e) => { e.preventDefault(); onNavigate && onNavigate(it.id); }}>
          <i className={"bx bx" + (it.icon.startsWith("bxl-") ? "" : "-") + it.icon.replace(/^bx-/, "") + " icon-17"} aria-hidden="true"></i> {it.label}</a>)}</nav>
    <main className="settings-main">{title ? <div className="settings-head"><h2>{title}</h2>{description ? <p>{description}</p> : null}</div> : null}{children}</main>
  </div>;
}
