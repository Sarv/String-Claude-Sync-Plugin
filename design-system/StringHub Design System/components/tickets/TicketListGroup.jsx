import React from "react";
const STATE_COLORS = { open: "#94A3B8", "in-progress": "#F59E0B", "on-hold": "#6366F1", resolved: "#10B981", closed: "#374151" };
function ring(state, color, size) {
  const c = color || STATE_COLORS[state] || "#757575";
  const done = state === "resolved" || state === "closed";
  return <svg className={"tk-state" + (done ? " done" : "")} viewBox="0 0 26 26" style={{ "--c": c, width: size, height: size }} aria-hidden="true"><circle className="trk" r="9.75" cx="13" cy="13" /><circle className="arc" r="9.75" cx="13" cy="13" /><circle className="dot" r="4.5" cx="13" cy="13" /></svg>;
}
/** Collapsible List-view group (by state): sticky header with chevron, solid state pill, "N tickets", assignee avatars; rows; a "New Ticket" row at the end. */
export function TicketListGroup({ state = "open", label, color, count, avatars = [], children, onNew, defaultOpen = true }) {
  const names = { open: "Open", "in-progress": "In Progress", "on-hold": "On Hold", resolved: "Resolved", closed: "Closed" };
  const c = color || STATE_COLORS[state];
  return <details className="tk-list-card tk-group" open={defaultOpen}>
    <summary><i className="bx bx-chevron-down tk-chev" aria-hidden="true"></i><span className="tk-group-label state" style={{ "--c": c }}>{ring(state, "#FFFFFF", 14)} {label || names[state]}</span>
      <span className="tk-gcount">{count} ticket{count === 1 ? "" : "s"}</span><span className="tk-spacer"></span>
      <span className="tk-avatars">{avatars.map((p, i) => <span key={i} className={"tk-avatar c" + (p.tone || 1)}>{p.name.charAt(0)}</span>)}</span></summary>
    {children}
    <button type="button" className="tk-new-row" onClick={onNew}><i className="bx bx-plus" aria-hidden="true"></i> New Ticket</button>
  </details>;
}
