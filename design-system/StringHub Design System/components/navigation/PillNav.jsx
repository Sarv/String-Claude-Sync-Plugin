import React from "react";
/** Section nav with icons. items may include {group:"Label"} headings (vertical only). */
export function PillNav({ items = [], value, onChange, variant, label }) {
  return <nav className={"pill-nav" + (variant ? " " + variant : "")} aria-label={label}>{items.map((it, i) => it.group ? <div key={"g" + i} className="pill-nav-label">{it.group}</div> :
    <button key={it.id} className={it.id === value ? "active" : undefined} aria-pressed={it.id === value} onClick={() => onChange && onChange(it.id)}>
      {it.icon ? <i className={"bx bx-" + it.icon} style={{ fontSize: variant ? 16 : 15 }} aria-hidden="true"></i> : null} {it.label} {it.count != null ? <span className="count">{it.count}</span> : null}</button>)}</nav>;
}
