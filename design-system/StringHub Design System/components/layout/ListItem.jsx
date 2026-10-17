import React from "react";
export function ListItem({ name, tone, title, meta, sub, active, unread, onClick }) {
  return <a className={"list-item" + (active ? " active" : "") + (unread ? " unread" : "")} href="#" aria-current={active || undefined} onClick={(e) => { e.preventDefault(); onClick && onClick(); }}>
    <span className={"avatar avatar-sm g" + (tone || 1)}>{String(name || "?").charAt(0).toUpperCase()}</span>
    <span className="li-body"><span className="li-head"><span className="li-title">{title}</span><span className="li-meta">{meta}</span></span><span className="li-sub">{sub}</span></span>
    {unread ? <span className="unread-dot" aria-label="Unread"></span> : null}</a>;
}
