import React from "react";
const L = (v) => v.charAt(0).toUpperCase() + v.slice(1);
export function ListRow({ id, title, priority, assignee, assigneeTone = 1, date, overdue, onClick }) {
  return <div className="list-row" onClick={onClick}><span className="lr-id">{id}</span><span className="lr-title">{title}</span>
    <span className="lr-meta">{priority ? <span className={"task-pill priority " + priority}>{L(priority)}</span> : null}{assignee ? <span className={"avatar avatar-sm g" + assigneeTone}>{assignee}</span> : null}</span>
    <span className={"lr-date" + (overdue ? " overdue" : "")}>{date || "—"}</span></div>;
}
