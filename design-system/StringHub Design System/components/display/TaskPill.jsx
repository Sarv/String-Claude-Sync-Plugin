import React from "react";
const LABELS = { "in-progress": "In progress", "in-review": "In review", "on-hold": "On hold" };
/** Work-item pill: status / priority / type (.task-pill). */
export function TaskPill({ kind = "status", value, dot, children }) {
  const label = children ?? (LABELS[value] || (value.charAt(0).toUpperCase() + value.slice(1)));
  return <span className={["task-pill", dot && "dot", kind, value].filter(Boolean).join(" ")}>{label}</span>;
}
