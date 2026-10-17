import React from "react";
export function Segmented({ items = [], value, onChange, label, width }) {
  return <div className="seg" role="group" aria-label={label} style={width ? { width } : undefined}>{items.map((it) => { const o = typeof it === "string" ? { id: it, label: it } : it;
    return <button key={o.id} className={"seg-btn" + (o.id === value ? " is-on" : "")} aria-pressed={o.id === value} onClick={() => onChange && onChange(o.id)}>{o.icon ? <i className={"bx bx-" + o.icon + " icon-14"} aria-hidden="true"></i> : null}{o.icon ? " " : null}{o.label}</button>; })}</div>;
}
