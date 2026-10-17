import React from "react";
/** Say what's missing and what to do next. */
export function EmptyState({ icon = "search", tone, title, description, actions, compact }) {
  return <div className={"empty" + (compact ? " compact" : "")}>
    <div className={"art" + (tone ? " " + tone : "")}><i className={"bx bx-" + icon + (compact ? " icon-24" : " icon-36")} aria-hidden="true"></i></div>
    <h4>{title}</h4>{description ? <p>{description}</p> : null}{actions ? <div className="empty-actions">{actions}</div> : null}</div>;
}
