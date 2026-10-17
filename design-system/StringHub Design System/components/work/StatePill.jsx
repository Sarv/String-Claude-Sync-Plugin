import React from "react";
const ICON = { open: "circle", "in-progress": "loader-circle", "on-hold": "pause-circle", resolved: "check-circle", closed: "lock-alt" };
const LABEL = { open: "Open", "in-progress": "In progress", "on-hold": "On hold", resolved: "Resolved", closed: "Closed" };
/** Inline ticket state picker trigger. */
export function StatePill({ state = "open", onClick }) {
  return <button className={"state-pill " + state} onClick={onClick}><i className={"bx bx-" + ICON[state] + " icon-14"} aria-hidden="true"></i> {LABEL[state]}</button>;
}
