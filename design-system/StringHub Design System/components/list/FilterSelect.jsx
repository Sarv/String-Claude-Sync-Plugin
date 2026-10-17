import React from "react";
/** 30px inline filter dropdown ("Company: any"). options: strings or {value,label}. icon: optional leading Boxicons name for the main quick filter. */
export function FilterSelect({ icon, value, options = [], onChange, label }) {
  return <label className="filter-select">{icon ? <i className={"bx bx-" + icon} aria-hidden="true"></i> : null}
    <select value={value} aria-label={label || "Filter"} onChange={(e) => onChange && onChange(e.target.value)}>
      {options.map((o) => { const v = typeof o === "string" ? o : o.value; const l = typeof o === "string" ? o : o.label; return <option key={v} value={v}>{l}</option>; })}
    </select></label>;
}
