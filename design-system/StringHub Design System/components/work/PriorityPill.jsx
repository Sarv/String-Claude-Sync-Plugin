import React from "react";
export function PriorityPill({ priority = "none", onClick }) {
  return <button className={"priority-pill " + priority} onClick={onClick}><i className="bx bx-flag icon-13" aria-hidden="true"></i> {priority.charAt(0).toUpperCase() + priority.slice(1)}</button>;
}
