import React from "react";
/** Toggle buttons that filter a list in place. */
export function FilterTabs({ items = [], value, onChange, label }) {
  return <div className="filter-tabs" role="group" aria-label={label}>{items.map((it) => { const o = typeof it === "string" ? { id: it, label: it } : it;
    return <button key={o.id} className={o.id === value ? "active" : undefined} aria-pressed={o.id === value} onClick={() => onChange && onChange(o.id)}>{o.label}{o.count != null ? <> <span className="count">{o.count}</span></> : null}</button>; })}</div>;
}
