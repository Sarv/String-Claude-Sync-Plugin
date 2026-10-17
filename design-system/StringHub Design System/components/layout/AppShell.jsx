import React from "react";
import { Sidebar } from "./Sidebar.jsx";
import { Topbar } from "./Topbar.jsx";
/** Full-height app: sidebar + topbar + scrolling page. */
export function AppShell({ nav, active, onNavigate, collapsed, onToggleSidebar, logoSrc, topbar, children, page = true }) {
  return <div className="sh-shell">
    <Sidebar nav={nav} active={active} onNavigate={onNavigate} collapsed={collapsed} logoSrc={logoSrc} />
    <div className="sh-body">{topbar ?? <Topbar onToggleSidebar={onToggleSidebar} />}{page ? <main className="page">{children}</main> : children}</div>
  </div>;
}
