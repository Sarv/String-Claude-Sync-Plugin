import React from "react";
const DEFAULT_VIEWS = [{ value: "list", icon: "list-ul", label: "List view" }, { value: "split", icon: "sidebar", label: "Split view" }];
/** Icon-cell layout switcher (List / Split). The active cell is tinted with brand icon. */
export function ViewToggle({ value = "list", options = DEFAULT_VIEWS, onChange }) {
  return <div className="view-toggle" role="group" aria-label="Layout">
    {options.map((o) => <button key={o.value} type="button" className={o.value === value ? "active" : ""} aria-pressed={o.value === value} title={o.label} aria-label={o.label} onClick={() => onChange && onChange(o.value)}><i className={"bx bx-" + o.icon} aria-hidden="true"></i></button>)}
  </div>;
}
