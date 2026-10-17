import React from "react";
/** Replaces the ListToolbar controls while rows are checked. actions: [{label, icon?, menu?, danger?, disabled?, onClick?}] - danger actions go after the spacer. */
export function BulkBar({ count, actions = [], onClear }) {
  const btn = (a, i) => <button key={i} type="button" className={a.danger ? "danger" : ""} disabled={a.disabled} onClick={a.onClick}>{a.icon ? <i className={"bx bx-" + a.icon} aria-hidden="true"></i> : null}{a.label}{a.menu ? <i className="bx bx-chevron-down" aria-hidden="true"></i> : null}</button>;
  return <div className="bulk-bar" role="toolbar" aria-label="Bulk actions">
    <span className="bb-count">{count} selected</span><span className="bb-sep"></span>
    {actions.filter((a) => !a.danger).map(btn)}
    <span style={{ flex: 1 }}></span>
    {actions.filter((a) => a.danger).map(btn)}
    <button type="button" className="bb-close" aria-label="Clear selection" onClick={onClear}><i className="bx bx-x" aria-hidden="true"></i></button>
  </div>;
}
