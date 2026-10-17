import React from "react";
/** Underline tabs — switch views of one object. */
export function Tabs({ items = [], value, onChange, label }) {
  return <div className="tabs-underline" role="tablist" aria-label={label}>{items.map((it) => <button key={it.id} role="tab" className={it.id === value ? "active" : undefined} aria-selected={it.id === value} onClick={() => onChange && onChange(it.id)}>{it.label} {it.count != null ? <span className="count">{it.count}</span> : null}</button>)}</div>;
}
