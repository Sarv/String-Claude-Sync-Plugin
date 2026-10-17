import React from "react";
/** 47px gradient header with search, icon buttons and profile avatar. */
export function Topbar({ onToggleSidebar, search = true, children, avatar = "P", onToggleTheme, onBell }) {
  return <header className="sh-topbar sh-header">
    {onToggleSidebar ? <button className="icon-btn sm" aria-label="Toggle sidebar" onClick={onToggleSidebar}><i className="bx bx-sidebar icon-16" aria-hidden="true"></i></button> : null}
    {search === true ? <div className="input-group input-search"><i className="bx bx-search icon-16" aria-hidden="true"></i><input placeholder="Search…" aria-label="Search" /></div> : search || null}
    <div className="spacer"></div>{children}
    <button className="icon-btn" aria-label="Notifications" onClick={onBell}><i className="bx bx-bell icon-20" aria-hidden="true"></i></button>
    {onToggleTheme ? <button className="icon-btn" aria-label="Toggle dark mode" onClick={onToggleTheme}><i className="bx bx-moon icon-20" aria-hidden="true"></i></button> : null}
    <span className="avatar ring">{avatar}</span></header>;
}
