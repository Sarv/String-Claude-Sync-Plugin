import React from "react";
/** Ghost header action (Export, Import CSV, Merge duplicates). Put them in PageHeader actions before the one primary button. */
export function HeaderButton({ icon, children, onClick }) {
  return <button type="button" className="btn btn-header" onClick={onClick}>{icon ? <i className={"bx bx-" + icon} aria-hidden="true"></i> : null}{children}</button>;
}
