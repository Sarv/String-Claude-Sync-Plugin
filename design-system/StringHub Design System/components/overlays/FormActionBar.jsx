import React from "react";
/** Right-aligned Cancel + Save at the end of every form / settings page. */
export function FormActionBar({ note, sticky, children }) {
  return <div className={"form-action-bar" + (sticky ? " sticky" : "")}>{note ? <span className="fab-note"><i className="bx bx-info-circle icon-14" aria-hidden="true"></i> {note}</span> : null}{children}</div>;
}
