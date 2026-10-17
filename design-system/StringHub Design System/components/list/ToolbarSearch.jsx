import React from "react";
/** 30px search box that grows between filters (min 180, max 280). hint: small right-side text like "min 4 chars". */
export function ToolbarSearch({ value, placeholder = "Search…", hint, onChange }) {
  return <label className="toolbar-search"><i className="bx bx-search" aria-hidden="true"></i>
    <input value={value} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onChange && onChange(e.target.value)} />
    {hint ? <span className="ts-hint">{hint}</span> : null}</label>;
}
