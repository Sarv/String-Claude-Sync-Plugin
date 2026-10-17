import React from "react";
const L = (v) => v.charAt(0).toUpperCase() + v.slice(1);
export function BoardCard({ id, title, type, priority, due, overdue, comments, subtasks, assignee, assigneeTone = 1, onClick }) {
  return <article className="board-card" tabIndex={0} draggable onClick={onClick}>
    <span className="bcard-id">{id}</span><span className="bcard-title">{title}</span>
    {type || priority ? <div className="bcard-tags">{type ? <span className={"task-pill type " + type}>{L(type)}</span> : null}{priority ? <span className={"task-pill priority " + priority}>{L(priority)}</span> : null}</div> : null}
    <div className="bcard-foot"><span className={"bcard-meta" + (overdue ? " overdue" : "")}><i className="bx bx-calendar icon-12" aria-hidden="true"></i> {due || "—"}</span>
      {comments != null ? <span className="bcard-meta"><i className="bx bx-comment-detail icon-12" aria-hidden="true"></i> {comments}</span> : null}
      {subtasks ? <span className="bcard-meta"><i className="bx bx-git-branch icon-12" aria-hidden="true"></i> {subtasks}</span> : null}
      {assignee ? <span className={"avatar avatar-sm g" + assigneeTone}>{assignee}</span> : null}</div>
  </article>;
}
