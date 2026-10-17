import React from "react";
/** App sidebar: brand + lavender nav panel. nav: [{id,label,icon}] or {group}. */
export function Sidebar({ nav = [], active, onNavigate, collapsed, logoSrc = "assets/stringhub-mark.svg", brand = "StringHub" }) {
  return <aside className={"sh-sidebar" + (collapsed ? " collapsed" : "")} aria-label="Main navigation">
    <div className="sh-brand"><img src={logoSrc} alt="" /><span>{brand}</span></div>
    <nav className="sh-sidebar-panel">{nav.map((it, i) => it.group ? <div key={"g" + i} className="sh-nav-label">{it.group}</div> :
      <a key={it.id} className={"sh-nav-item" + (it.id === active ? " active" : "")} href="#" aria-current={it.id === active ? "page" : undefined} aria-label={it.label}
        data-tip={collapsed ? it.label : undefined} data-tip-pos={collapsed ? "right" : undefined} onClick={(e) => { e.preventDefault(); onNavigate && onNavigate(it.id); }}>
        <i className={"bx bx-" + it.icon + " icon-18"} aria-hidden="true"></i><span>{it.label}</span></a>)}</nav>
  </aside>;
}
