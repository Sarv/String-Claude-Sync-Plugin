import React from "react";
const LABEL = { backlog: "Backlog", "in-progress": "In progress", "in-review": "In review", completed: "Completed", "on-hold": "On hold", cancelled: "Cancelled", started: "Started", unstarted: "Unstarted" };
/** Collapsible group of ListRows (native <details>). Put groups in <div className="list-view">. */
export function ListGroup({ status = "backlog", label, count, open = true, children }) {
  return <details className="list-group" open={open}>
    <summary className="list-group-head"><span className="lg-chev"></span><span className={"task-pill dot status " + status}>{label ?? LABEL[status]}</span><span className="lg-count">{count ?? React.Children.count(children)}</span></summary>
    {children}</details>;
}
