import React from "react";
export function OptionChips({ options = [], value = [], onChange, single, label }) {
  const toggle = (o) => { if (!onChange) return; if (single) onChange([o]); else onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]); };
  return <div className="opt-chips" role="group" aria-label={label}>{options.map((o) => <button key={o} type="button" className={"opt-chip" + (value.includes(o) ? " is-on" : "")} aria-pressed={value.includes(o)} onClick={() => toggle(o)}>{o}</button>)}</div>;
}
