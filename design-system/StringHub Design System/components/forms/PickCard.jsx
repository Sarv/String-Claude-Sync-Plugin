import React from "react";
/** Selectable card with title + one sentence. Put several in <div className="pick-grid">. */
export function PickCard({ icon, title, description, selected, onClick }) {
  return <button type="button" className={"pick-card" + (selected ? " selected" : "")} aria-pressed={!!selected} onClick={onClick}>
    <span className="pick-head">{icon ? <i className={"bx bx-" + icon + " pick-ico"} aria-hidden="true"></i> : null}<span className="pick-title">{title}</span><i className="bx bx-check-circle pick-check" aria-hidden="true"></i></span>
    {description ? <span className="pick-desc">{description}</span> : null}</button>;
}
