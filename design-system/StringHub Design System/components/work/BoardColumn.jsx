import React from "react";
const LABEL = { backlog: "Backlog", unstarted: "Unstarted", started: "Started", "in-progress": "In progress", "in-review": "In review", completed: "Done", cancelled: "Cancelled", "on-hold": "On hold" };
/** Kanban column (280px). Put columns in <div className="board">. */
export function BoardColumn({ status = "backlog", title, count, onAdd, children }) {
  const t = title ?? LABEL[status];
  return <section className="board-column" aria-label={t}>
    <header className="board-column-head"><span className="bc-dot" style={{ "--_c": "var(--task-status-" + status + "-ink)" }}></span><span className="bc-title">{t}</span>
      <span className="bc-count">{count ?? React.Children.count(children)}</span><button className="btn-close" aria-label={"Add to " + t} onClick={onAdd}><i className="bx bx-plus icon-14" aria-hidden="true"></i></button></header>
    <div className="board-card-list">{children}</div>
    <footer className="board-column-foot"><button className="btn btn-ghost btn-sm" onClick={onAdd}><i className="bx bx-plus icon-14" aria-hidden="true"></i> Add work item</button></footer>
  </section>;
}
